import { ChannexApiService } from '../lib/channex/channex-api';

/**
 * Script to solve the Channex API test scenario
 * 
 * Test requirements:
 * - Property Name "Test Property - (Provider Name)"
 * - Test Currency: USD
 * - Create two Room Types: Twin Room (2 Occupancy), Double Room (2 Occupancy)
 * - Create four Rate Plans combinations:
 *   - Twin Room: Best Available Rate (100), Bed & Breakfast Rate (120)
 *   - Double Room: Best Available Rate (100), Bed & Breakfast Rate (120)
 */

async function runChannexTestScenario() {
  // Use the provided test API key
  const apiKey = 'u3KNUaPhFo3m5fjyXWgEYQRqRFqPwG14mVut/J4dZwNJjGSIevp/ZoW26xhcf4g+';
  
  // Create Channex API service instance (this will work for staging environment)
  const channexService = new ChannexApiService(apiKey);
  
  try {
    console.log('Validating Channex API key...');
    const isValid = await channexService.validateApiKey();
    
    if (!isValid) {
      console.error('Invalid Channex API key!');
      return;
    }
    
    console.log('API key validated successfully!');
    
    console.log('Fetching properties...');
    const properties = await channexService.getProperties();
    
    console.log(`Found ${properties.length} properties`);
    
    // Look for the test property
    let testProperty = properties.find(prop => 
      prop.name.includes('Test Property') || prop.name.includes('Provider Name')
    );
    
    if (!testProperty) {
      console.log('Test property not found. Available properties:');
      properties.forEach(prop => {
        console.log(`- ${prop.id}: ${prop.name} (Currency: ${prop.currency_code})`);
      });
      console.log('\nPlease create the "Test Property - (Provider Name)" with USD currency in your Channex account first.');
      return;
    }
    
    console.log(`Using test property: ${testProperty.name} (ID: ${testProperty.id})`);
    
    console.log('Fetching room types for the test property...');
    const roomTypes = await channexService.getRoomTypes(testProperty.id);
    
    console.log(`Found ${roomTypes.length} room types`);
    roomTypes.forEach(rt => {
      console.log(`- ${rt.id}: ${rt.name}`);
    });
    
    // Look for Twin Room and Double Room
    const twinRoom = roomTypes.find(rt => rt.name.includes('Twin Room'));
    const doubleRoom = roomTypes.find(rt => rt.name.includes('Double Room'));
    
    if (!twinRoom || !doubleRoom) {
      console.log('\nRequired room types not found!');
      console.log('Expected: Twin Room and Double Room');
      console.log('Please create these room types in your Channex account first.');
      return;
    }
    
    console.log(`Found Twin Room: ${twinRoom.name} (ID: ${twinRoom.id})`);
    console.log(`Found Double Room: ${doubleRoom.name} (ID: ${doubleRoom.id})`);
    
    console.log('Fetching rate plans for the test property...');
    const ratePlans = await channexService.getRatePlans(testProperty.id);
    
    console.log(`Found ${ratePlans.length} rate plans`);
    
    // Filter rate plans by room type
    const twinRoomRatePlans = ratePlans.filter(rp => rp.room_type_id === twinRoom.id);
    const doubleRoomRatePlans = ratePlans.filter(rp => rp.room_type_id === doubleRoom.id);
    
    console.log(`Twin Room has ${twinRoomRatePlans.length} rate plans`);
    twinRoomRatePlans.forEach(rp => {
      console.log(`- ${rp.id}: ${rp.name}`);
    });
    
    console.log(`Double Room has ${doubleRoomRatePlans.length} rate plans`);
    doubleRoomRatePlans.forEach(rp => {
      console.log(`- ${rp.id}: ${rp.name}`);
    });
    
    // Find the required rate plans
    const twinBestAvailable = twinRoomRatePlans.find(rp => 
      rp.name.includes('Best Available Rate') || rp.name.includes('Best Available')
    );
    const twinBedBreakfast = twinRoomRatePlans.find(rp => 
      rp.name.includes('Bed & Breakfast Rate') || rp.name.includes('Bed & Breakfast')
    );
    const doubleBestAvailable = doubleRoomRatePlans.find(rp => 
      rp.name.includes('Best Available Rate') || rp.name.includes('Best Available')
    );
    const doubleBedBreakfast = doubleRoomRatePlans.find(rp => 
      rp.name.includes('Bed & Breakfast Rate') || rp.name.includes('Bed & Breakfast')
    );
    
    // Output the results in the format needed for the test
    console.log('\n--- CHANNEX TEST SCENARIO RESULTS ---');
    console.log('Fill in the following fields:');
    console.log(`Property ID at Channex: ${testProperty.id}`);
    console.log(`Twin Room ID at Channex: ${twinRoom.id}`);
    console.log(`Twin Room Best Available Rate ID at Channex: ${twinBestAvailable?.id || 'NOT FOUND'}`);
    console.log(`Twin Room Bed & Breakfast Rate ID at Channex: ${twinBedBreakfast?.id || 'NOT FOUND'}`);
    console.log(`Double Room ID at Channex: ${doubleRoom.id}`);
    console.log(`Double Room Best Available Rate ID at Channex: ${doubleBestAvailable?.id || 'NOT FOUND'}`);
    console.log(`Double Room Bed & Breakfast Rate ID at Channex: ${doubleBedBreakfast?.id || 'NOT FOUND'}`);
    
    // Check if all required entities exist
    if (!twinBestAvailable || !twinBedBreakfast || !doubleBestAvailable || !doubleBedBreakfast) {
      console.log('\nMISSING ENTITIES: You need to create the following rate plans in Channex:');
      if (!twinBestAvailable) console.log('- Best Available Rate for Twin Room');
      if (!twinBedBreakfast) console.log('- Bed & Breakfast Rate for Twin Room');
      if (!doubleBestAvailable) console.log('- Best Available Rate for Double Room');
      if (!doubleBedBreakfast) console.log('- Bed & Breakfast Rate for Double Room');
    } else {
      console.log('\nAll required entities are present in your Channex account!');
    }
  } catch (error) {
    console.error('Error during test scenario:', error);
  }
}

// Run the test scenario
runChannexTestScenario();