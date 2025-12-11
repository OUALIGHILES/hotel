-- RLS Policies for Guests Table
-- These policies allow property managers to manage guests associated with their properties

-- Policy to allow users to select guests associated with their properties via reservations
CREATE POLICY "guests_select_for_property_owners"
  ON public.guests FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT g.id
      FROM guests g
      LEFT JOIN reservations r ON g.id = r.guest_id
      LEFT JOIN units u ON r.unit_id = u.id
      LEFT JOIN properties p ON u.property_id = p.id
      WHERE p.user_id = auth.uid()
      OR g.user_id = auth.uid()  -- In case guest is directly linked to user
    )
  );

-- Policy to allow users to insert guests for their properties
CREATE POLICY "guests_insert_for_property_owners"
  ON public.guests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id  -- Guests can only be added by the property manager
  );

-- Policy to allow users to update guests associated with their properties
CREATE POLICY "guests_update_for_property_owners"
  ON public.guests FOR UPDATE
  USING (
    id IN (
      SELECT DISTINCT g.id
      FROM guests g
      LEFT JOIN reservations r ON g.id = r.guest_id
      LEFT JOIN units u ON r.unit_id = u.id
      LEFT JOIN properties p ON u.property_id = p.id
      WHERE p.user_id = auth.uid()
      OR g.user_id = auth.uid()
    )
  );

-- Policy to allow users to delete guests associated with their properties
CREATE POLICY "guests_delete_for_property_owners"
  ON public.guests FOR DELETE
  USING (
    id IN (
      SELECT DISTINCT g.id
      FROM guests g
      LEFT JOIN reservations r ON g.id = r.guest_id
      LEFT JOIN units u ON r.unit_id = u.id
      LEFT JOIN properties p ON u.property_id = p.id
      WHERE p.user_id = auth.uid()
      OR g.user_id = auth.uid()
    )
  );