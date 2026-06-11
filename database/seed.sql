-- Database seed file for Supabase PostgreSQL

-- Insert default admin GUDURU PAVAN (password: admin123, hashed using bcrypt)
INSERT INTO public.users (email, password_hash, full_name, phone_number, is_admin)
VALUES (
  'designvallet01@gmail.com',
  '$2a$10$oR1r2zB4p7K7bH46XN9M3.rF6jB3b6u.c8vU2R.oFv.1m64n91Z.e',
  'GUDURU PAVAN',
  '9052572363',
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert developer G. GOWRINARAYANA (ELITE WEB KINGDOM) (password: admin123, hashed using bcrypt)
INSERT INTO public.users (email, password_hash, full_name, phone_number, is_admin)
VALUES (
  'gowrinarayanaguduru@gmail.com',
  '$2a$10$oR1r2zB4p7K7bH46XN9M3.rF6jB3b6u.c8vU2R.oFv.1m64n91Z.e',
  'G. GOWRINARAYANA (ELITE WEB KINGDOM)',
  '9985369590',
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert test user (password: user123, hashed using bcrypt)
INSERT INTO public.users (email, password_hash, full_name, phone_number, is_admin)
VALUES (
  'user@designvallet.com',
  '$2a$10$zYcE/p/6r5U2sD99G9W1XeVhL7h1tH8G1e59p1tH8G1e59p1tH8G1e',
  'Jane Doe',
  '+1987654321',
  FALSE
) ON CONFLICT (email) DO NOTHING;

-- Insert initial coupons
INSERT INTO public.coupons (code, discount_percent, is_active, expires_at)
VALUES 
('SAVE10', 10, TRUE, '2030-01-01 00:00:00+00'),
('WELCOME50', 50, TRUE, '2030-01-01 00:00:00+00')
ON CONFLICT (code) DO NOTHING;

-- Insert initial mock images
INSERT INTO public.images (title, description, category, price, original_s3_key, preview_s3_key, is_active)
VALUES
(
  'Majestic Mountain Sunrise',
  'Stunning sun rays breaking through snow-covered alpine mountain peaks at early dawn.',
  'Border',
  499.00,
  'originals/nature_mountain_sunrise_orig.jpg',
  'previews/nature_mountain_sunrise_prev.jpg',
  TRUE
),
(
  'Neon Cyberpunk Alleyways',
  'Vibrant pink and cyan neon signboards reflecting on wet concrete in a futuristic urban street.',
  'Pallu',
  299.00,
  'originals/urban_cyberpunk_neon_orig.jpg',
  'previews/urban_cyberpunk_neon_prev.jpg',
  TRUE
),
(
  'Vibrant Abstract Fluid Art',
  'Colorful swirling paint pigments creating intricate patterns of acrylic fluid dynamic movement.',
  'Butta',
  399.00,
  'originals/abstract_fluid_art_orig.jpg',
  'previews/abstract_fluid_art_prev.jpg',
  TRUE
),
(
  'Enigmatic Studio Portrait',
  'High-contrast black and white fine-art portrait focusing on dramatic side lighting and facial expressions.',
  'Broket',
  599.00,
  'originals/portrait_studio_bw_orig.jpg',
  'previews/portrait_studio_bw_prev.jpg',
  TRUE
),
(
  'Misty Autumn Woods Path',
  'A winding trail leading through golden and amber trees covered in soft morning fog.',
  'Border',
  199.00,
  'originals/nature_misty_woods_orig.jpg',
  'previews/nature_misty_woods_prev.jpg',
  TRUE
);
