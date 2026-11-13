<?php
// Heading
$_['heading_title']      = 'Mobile App API';

// Text
$_['text_extension']     = 'Extensions';
$_['text_success']       = 'Success: You have modified the Mobile App API settings!';
$_['text_edit']          = 'Edit Mobile App API';
$_['text_none']          = '--- None ---';
$_['text_endpoint']      = 'API endpoint (for reference / testing)';
$_['text_generate']      = 'Generate';
$_['text_help']          = 'In the mobile app\'s src/config.ts set baseUrl to your store URL (e.g. https://your-store.com/ — not the API URL below) and apiKey to the key below.';

// Entry
$_['entry_status']       = 'Status';
$_['entry_key']          = 'API Key';
$_['entry_cors']         = 'CORS Origin';
$_['entry_banner']       = 'Home Banner';
$_['entry_featured']     = 'Featured Product IDs';
$_['entry_home_limit']   = 'Products per Home Section';
$_['entry_image']        = 'Product Image Size (W x H)';
$_['entry_color_primary']   = 'Primary Colour';
$_['entry_color_secondary'] = 'Secondary Colour';
$_['entry_color_tertiary']  = 'Tertiary Colour';
$_['entry_color_text']      = 'Font Colour';
$_['entry_color_button']      = 'Button Colour';
$_['entry_color_button_text'] = 'Button Text Colour';
$_['text_auto']          = 'Automatic (leave empty)';
$_['text_colors']        = 'App Colours';
$_['text_reset']         = 'Reset';

// Help
$_['help_key']           = 'Sent by the app in the X-Api-Key header. 20-64 letters and numbers.';
$_['help_cors']          = 'Only needed for testing the app in a web browser (Expo web), e.g. http://localhost:8081 or *. Leave empty for native apps.';
$_['help_color_primary']   = 'Buttons, links, active tab and selected options.';
$_['help_color_secondary'] = 'Sale badges, special prices, wishlist hearts and cart/wishlist count badges.';
$_['help_color_tertiary']  = 'Header and tab bar background. Text on it switches between dark and white automatically. Changes show the next time the app is opened.';
$_['help_color_text']      = 'Main text colour for product names, headings and body text. Muted text (hints, dates) is a lighter shade of it. Use a dark colour, because the app background is light.';
$_['help_color_button']      = 'Background of the main buttons (Add to cart, Checkout, Place order, Log in…). Leave empty to use the primary colour.';
$_['help_color_button_text'] = 'Text and icon colour on those buttons. Leave empty to pick white or dark automatically for the best contrast.';
$_['help_featured']      = 'Comma separated product IDs, e.g. 40,42,30';

// Error
$_['error_permission']   = 'Warning: You do not have permission to modify the Mobile App API!';
$_['error_color']        = 'Colour must be a hex value like #1f6feb!';
$_['error_key']          = 'API key must be 20-64 letters and numbers!';
