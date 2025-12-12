import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Define the schema for property settings
const propertySettingsSchema = z.object({
  property_id: z.string().min(1, 'Property ID is required'),
  property_name: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  property_type: z.string().min(1, 'Property type is required'),
  check_in_time: z.string(),
  check_out_time: z.string(),
  max_occupancy: z.number().min(1, 'Max occupancy must be at least 1'),
  
  // Pricing
  base_price: z.number().min(0, 'Base price must be positive'),
  weekend_price: z.number().min(0, 'Weekend price must be positive'),
  
  // Discounts
  weekly_discount_percent: z.number().min(0).max(100, 'Discount cannot exceed 100%'),
  monthly_discount_percent: z.number().min(0).max(100, 'Discount cannot exceed 100%'),
  last_minute_discount_percent: z.number().min(0).max(100, 'Discount cannot exceed 100%'),
  early_booking_discount_percent: z.number().min(0).max(100, 'Discount cannot exceed 100%'),
  
  // Stay restrictions
  minimum_nights: z.number().min(1, 'Must be at least 1 night'),
  maximum_nights: z.number().min(1, 'Must be at least 1 night'),
  allow_same_day_booking: z.boolean(),
  same_day_cutoff_time: z.string(),
  
  // Security deposit
  security_deposit_required: z.boolean(),
  security_deposit_amount: z.number().min(0).optional(),
  
  // Auto Messages
  booking_confirmation_msg: z.string().optional(),
  pre_arrival_instructions_msg: z.string().optional(),
  smart_lock_code_msg: z.string().optional(),
  welcome_msg: z.string().optional(),
  checkout_instructions_msg: z.string().optional(),
  post_checkout_thanks_msg: z.string().optional(),
  
  // Guest Guide
  guest_guide_pdf_url: z.string().optional(),
  wifi_credentials: z.string().optional(),
  property_rules: z.string().optional(),
  instructions: z.string().optional(),
  
  // Housekeeping
  auto_create_cleaning_tasks: z.boolean(),
  cleaning_fee: z.number().min(0).optional(),
  cleaning_checklist: z.array(z.string()).optional(),
  turnover_hours: z.number().min(0).optional(),
  
  // Maintenance
  maintenance_categories: z.array(z.string()).optional(),
  auto_notify_technician: z.boolean(),
  
  // Payments
  accepted_payment_methods: z.array(z.string()).optional(),
  
  // Taxes
  vat_enabled: z.boolean(),
  vat_percentage: z.number().min(0).optional(),
  tourism_tax_enabled: z.boolean(),
  tourism_tax_amount: z.number().min(0).optional(),
  
  // Invoice settings
  invoice_footer_text: z.string().optional(),
  invoice_logo_url: z.string().optional(),
  invoice_terms: z.string().optional(),
  
  // Notifications
  notify_new_booking: z.boolean(),
  notify_cancellation: z.boolean(),
  notify_payment_received: z.boolean(),
  notify_guest_message: z.boolean(),
  notify_cleaning_task_assigned: z.boolean(),
  notify_maintenance_issue: z.boolean(),
  
  // Notification channels
  notification_channels: z.record(z.boolean()).optional(),
  
  // Website settings
  website_description: z.string().optional(),
  website_photos: z.array(z.string()).optional(),
  booking_policy: z.string().optional(),
  cancellation_policy: z.string().optional(),
  custom_domain: z.string().optional(),
  seo_title: z.string().optional(),
  seo_meta_tags: z.array(z.string()).optional(),
  
  // Booking engine
  enable_direct_booking: z.boolean(),
  accept_online_payments: z.boolean(),
  promotions_and_coupons: z.array(z.any()).optional(),
  
  // Automation
  auto_send_welcome_msg: z.boolean(),
  auto_generate_smart_lock_code: z.boolean(),
  auto_create_cleaning_task: z.boolean(),
  auto_close_cleaning_task: z.boolean(),
  auto_update_prices_based_on_occupancy: z.boolean(),
  
  // Reports
  default_report_period: z.string().optional(),
  preferred_metrics_order: z.array(z.string()).optional(),
  export_formats: z.array(z.string()).optional(),
  
  // Amenities and directions
  amenities: z.array(z.string()).optional(),
  house_rules: z.string().optional(),
  directions: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const validatedData = propertySettingsSchema.parse(body);
    
    // Verify that the property belongs to the user
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', validatedData.property_id)
      .eq('user_id', user.id)
      .limit(1)
      .single();
    
    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found or not owned by user' }, { status: 404 });
    }
    
    // Check if settings already exist
    const { data: existingSettings, error: checkError } = await supabase
      .from('property_settings')
      .select('id')
      .eq('property_id', validatedData.property_id)
      .limit(1);
    
    let result;
    if (checkError || !existingSettings || existingSettings.length === 0) {
      // Insert new settings
      result = await supabase
        .from('property_settings')
        .insert([validatedData]);
    } else {
      // Update existing settings
      result = await supabase
        .from('property_settings')
        .update(validatedData)
        .eq('property_id', validatedData.property_id);
    }
    
    if (result.error) {
      console.error('Error saving property settings:', result.error);
      return NextResponse.json({ error: 'Failed to save property settings' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Property settings saved successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    console.error('Error saving property settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract property ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const propertyId = pathParts[pathParts.length - 1]; // Get the last part of the URL
    
    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }
    
    // Verify that the property belongs to the user
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .limit(1)
      .single();
    
    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found or not owned by user' }, { status: 404 });
    }
    
    // Get the property settings
    const { data: settings, error } = await supabase
      .from('property_settings')
      .select('*')
      .eq('property_id', propertyId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        // Return default empty settings
        return NextResponse.json({
          property_id: propertyId,
          property_name: '',
          address: '',
          property_type: '',
          check_in_time: '15:00',
          check_out_time: '11:00',
          max_occupancy: 1,
          amenities: [],
          house_rules: '',
          directions: '',
          images: [],
          base_price: 0,
          weekend_price: 0,
          weekly_discount_percent: 0,
          monthly_discount_percent: 0,
          last_minute_discount_percent: 0,
          early_booking_discount_percent: 0,
          minimum_nights: 1,
          maximum_nights: 365,
          allow_same_day_booking: false,
          same_day_cutoff_time: '12:00',
          booking_confirmation_msg: '',
          pre_arrival_instructions_msg: '',
          smart_lock_code_msg: '',
          welcome_msg: '',
          checkout_instructions_msg: '',
          post_checkout_thanks_msg: '',
          guest_guide_pdf_url: '',
          wifi_credentials: '',
          property_rules: '',
          instructions: '',
          auto_create_cleaning_tasks: true,
          cleaning_fee: 0,
          cleaning_checklist: [],
          turnover_hours: 2,
          maintenance_categories: ['Plumbing', 'Electrical', 'HVAC', 'Furniture', 'Appliance'],
          auto_notify_technician: true,
          security_deposit_required: false,
          security_deposit_amount: 0,
          accepted_payment_methods: ['cash', 'bank_transfer', 'pos'],
          vat_enabled: false,
          vat_percentage: 0,
          tourism_tax_enabled: false,
          tourism_tax_amount: 0,
          invoice_footer_text: '',
          invoice_logo_url: '',
          invoice_terms: '',
          notify_new_booking: true,
          notify_cancellation: true,
          notify_payment_received: true,
          notify_guest_message: true,
          notify_cleaning_task_assigned: true,
          notify_maintenance_issue: true,
          notification_channels: { email: true, sms: false, whatsapp: false, push: true },
          website_description: '',
          website_photos: [],
          booking_policy: '',
          cancellation_policy: '',
          custom_domain: '',
          seo_title: '',
          seo_meta_tags: [],
          enable_direct_booking: true,
          accept_online_payments: false,
          promotions_and_coupons: [],
          auto_send_welcome_msg: true,
          auto_generate_smart_lock_code: false,
          auto_create_cleaning_task: true,
          auto_close_cleaning_task: true,
          auto_update_prices_based_on_occupancy: false,
          default_report_period: 'monthly',
          preferred_metrics_order: ['revenue', 'occupancy', 'adr'],
          export_formats: ['CSV', 'PDF'],
        });
      }
      return NextResponse.json({ error: 'Failed to fetch property settings' }, { status: 500 });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching property settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}