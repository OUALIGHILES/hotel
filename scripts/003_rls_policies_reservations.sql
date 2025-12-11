-- RLS Policies for Reservations Table
-- These policies allow property managers to manage reservations for their properties

-- Policy to allow users to select reservations associated with their properties
CREATE POLICY "reservations_select_for_property_owners"
  ON public.reservations FOR SELECT
  USING (
    unit_id IN (
      SELECT units.id
      FROM units
      JOIN properties ON units.property_id = properties.id
      WHERE properties.user_id = auth.uid()
    )
  );

-- Policy to allow users to insert reservations for their units
CREATE POLICY "reservations_insert_for_property_owners"
  ON public.reservations FOR INSERT
  WITH CHECK (
    unit_id IN (
      SELECT units.id
      FROM units
      JOIN properties ON units.property_id = properties.id
      WHERE properties.user_id = auth.uid()
    )
  );

-- Policy to allow users to update reservations for their units
CREATE POLICY "reservations_update_for_property_owners"
  ON public.reservations FOR UPDATE
  USING (
    unit_id IN (
      SELECT units.id
      FROM units
      JOIN properties ON units.property_id = properties.id
      WHERE properties.user_id = auth.uid()
    )
  );

-- Policy to allow users to delete reservations for their units
CREATE POLICY "reservations_delete_for_property_owners"
  ON public.reservations FOR DELETE
  USING (
    unit_id IN (
      SELECT units.id
      FROM units
      JOIN properties ON units.property_id = properties.id
      WHERE properties.user_id = auth.uid()
    )
  );