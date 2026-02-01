-- Update profile trigger to handle OAuth providers (Google: given_name, family_name; fallback: full_name)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
BEGIN
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'given_name',
    ''
  );
  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'family_name',
    ''
  );

  -- Fallback: split full_name on first space
  IF v_first_name = '' AND v_last_name = '' THEN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    IF v_full_name != '' THEN
      v_first_name := COALESCE(split_part(v_full_name, ' ', 1), '');
      v_last_name := COALESCE(trim(substring(v_full_name from position(' ' in v_full_name))), '');
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(v_first_name), ''), ''),
    COALESCE(NULLIF(trim(v_last_name), ''), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
