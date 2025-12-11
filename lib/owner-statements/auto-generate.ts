// lib/owner-statements/auto-generate.ts

import { createClient } from "@/lib/supabase/server";

/**
 * Automatically generates owner statements for all properties for the previous month
 */
export async function generateAllOwnerStatements() {
  const supabase = createClient();
  
  try {
    // Calculate the previous month's period
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodStart = previousMonth.toISOString().split('T')[0]; // YYYY-MM-DD
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]; // Last day of previous month
    
    console.log(`Generating owner statements for period: ${periodStart} to ${periodEnd}`);
    
    // Get all properties
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("id, user_id")
    
    if (propertiesError) {
      console.error("Error fetching properties:", propertiesError);
      return { success: false, error: propertiesError.message };
    }
    
    if (!properties || properties.length === 0) {
      console.log("No properties found to generate statements for");
      return { success: true, message: "No properties found" };
    }
    
    // Generate a statement for each property
    const results = [];
    
    for (const property of properties) {
      try {
        // Check if statement already exists for this period
        const { data: existingStatement, error: existingError } = await supabase
          .from("owner_statements")
          .select("id")
          .eq("property_id", property.id)
          .eq("period_start", periodStart)
          .eq("period_end", periodEnd)
          .single()
        
        if (!existingError && existingStatement) {
          console.log(`Statement already exists for property ${property.id}, skipping...`);
          results.push({
            property_id: property.id,
            status: "skipped",
            message: "Statement already exists"
          });
          continue;
        }
        
        // Get units for this property
        const { data: units, error: unitsError } = await supabase
          .from("units")
          .select("id")
          .eq("property_id", property.id)
        
        if (unitsError) {
          console.error(`Error fetching units for property ${property.id}:`, unitsError);
          results.push({
            property_id: property.id,
            status: "error",
            message: unitsError.message
          });
          continue;
        }
        
        const unitIds = units?.map(unit => unit.id) || [];
        
        // Fetch reservations for units of this property in the specified period
        const { data: reservations, error: reservationsError } = await supabase
          .from("reservations")
          .select(`
            id,
            guest_name,
            check_in_date,
            check_out_date,
            total_price,
            payment_status
          `)
          .in("unit_id", unitIds)
          .gte("check_in_date", periodStart)
          .lte("check_out_date", periodEnd)
          .in("payment_status", ["paid", "confirmed"]);
        
        if (reservationsError) {
          console.error(`Error fetching reservations for property ${property.id}:`, reservationsError);
          results.push({
            property_id: property.id,
            status: "error",
            message: reservationsError.message
          });
          continue;
        }
        
        // Calculate revenue from reservations
        const totalRevenue = reservations?.reduce((sum, res) => sum + (res.total_price || 0), 0) || 0;
        
        // Get expenses for this property in the period
        const { data: expenses, error: expensesError } = await supabase
          .from("expenses") // Assuming there's an expenses table
          .select("amount")
          .eq("property_id", property.id)
          .gte("date", periodStart)
          .lte("date", periodEnd);
        
        if (expensesError) {
          console.error(`Error fetching expenses for property ${property.id}:`, expensesError);
          // Continue without expenses for now
        }
        
        const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
        
        // Calculate management fee (assuming 10% default, but could be per-property setting)
        // In a real implementation, this would come from property/owner settings
        const managementFeePercent = 10; // Default to 10%
        const managementFee = totalRevenue * (managementFeePercent / 100);
        const netPayout = totalRevenue - totalExpenses - managementFee;
        
        // Insert the new owner statement
        const { data: newStatement, error: statementError } = await supabase
          .from("owner_statements")
          .insert({
            owner_id: property.user_id,
            property_id: property.id,
            period_start: periodStart,
            period_end: periodEnd,
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
            management_fee: managementFee,
            net_payout: netPayout,
            payout_status: "pending" // Default to pending
          })
          .select()
          .single();
        
        if (statementError) {
          console.error(`Error creating statement for property ${property.id}:`, statementError);
          results.push({
            property_id: property.id,
            status: "error",
            message: statementError.message
          });
          continue;
        }
        
        // Insert booking lines based on reservations
        if (reservations && reservations.length > 0) {
          const bookingLines = reservations.map(res => ({
            statement_id: newStatement.id,
            reservation_id: res.id,
            guest_name: res.guest_name,
            stay_dates: `${res.check_in_date} to ${res.check_out_date}`,
            revenue: res.total_price,
            taxes: 0, // Placeholder - would come from reservation data
            fees: 0, // Placeholder - could be platform fees
            net_revenue: res.total_price
          }));

          const { error: bookingLinesError } = await supabase
            .from("owner_statement_booking_lines")
            .insert(bookingLines);

          if (bookingLinesError) {
            console.error(`Error inserting booking lines for statement ${newStatement.id}:`, bookingLinesError);
            // Continue even if booking lines fail to insert
          }
        }
        
        // Insert expense lines based on property expenses
        if (expenses && expenses.length > 0) {
          const expenseLines = expenses.map(exp => ({
            statement_id: newStatement.id,
            expense_type: "Property Expense", // Default type, could be more specific
            amount: exp.amount,
            date: exp.date,
            notes: `Expense from ${exp.date}`
          }));

          const { error: expenseLinesError } = await supabase
            .from("owner_statement_expense_lines")
            .insert(expenseLines);

          if (expenseLinesError) {
            console.error(`Error inserting expense lines for statement ${newStatement.id}:`, expenseLinesError);
            // Continue even if expense lines fail to insert
          }
        }
        
        console.log(`Successfully generated statement for property ${property.id}`);
        results.push({
          property_id: property.id,
          status: "success",
          statement_id: newStatement.id
        });
      } catch (error) {
        console.error(`Error processing property ${property.id}:`, error);
        results.push({
          property_id: property.id,
          status: "error",
          message: (error as Error).message || "Unknown error"
        });
      }
    }
    
    console.log(`Completed generating owner statements. Processed ${results.length} properties.`);
    return { success: true, results };
  } catch (error) {
    console.error("Error in generateAllOwnerStatements function:", error);
    return { success: false, error: (error as Error).message || "Unknown error" };
  }
}