# Featured images for the WordPress series

`part-1.png` … `part-5.png` (1200 × 630) are the featured images for the five posts in `docs/developer-guide.wordpress.xml`. That size also works for social sharing previews (Open Graph).

| File | Post |
|---|---|
| `part-1.png` | Part 1: Overview, Architecture, Repository Layout and Languages |
| `part-2.png` | Part 2: Tools and Libraries, Why Expo, and the Development Environment |
| `part-3.png` | Part 3: The OpenCart Extension and the Mobile App |
| `part-4.png` | Part 4: Design Patterns, Hooks and End-to-End Flows |
| `part-5.png` | Part 5: Configuration, Security, Extending, Testing, Releasing and Troubleshooting |

A WordPress import file can't contain images. The importer downloads attachments from a public URL, so pick one of the three options below.

## Option A: attach them during import

1. Upload the five PNGs to any public folder, for example your site's `wp-content/uploads/oc-guide/` folder, a CDN, or a public repository.
2. Rebuild the import file with that folder's URL:

   ```bash
   WP_MEDIA_URL=https://your-site.com/wp-content/uploads/oc-guide \
   node docs/build-wordpress.cjs   # after: cd docs && npm ci
   ```

3. Import it with **Tools → Import → WordPress** and tick **"Download and import file attachments"**. Each post gets its image as the featured image, with alt text.

## Option B: set them by hand (about 2 minutes)

1. Import `developer-guide.wordpress.xml` as usual.
2. Open each draft post. In the sidebar, go to **Featured image → Set featured image → Upload files**, choose the matching `part-N.png`, and set the alt text to the post title.

## Option C: WP-CLI

Run this on the server after importing, with the PNGs copied to the server:

```bash
for n in 1 2 3 4 5; do
  id=$(wp post list --post_type=post --post_status=any --post_name__in=opencart-mobile-app-developer-guide-part-$n --field=ID)
  wp media import docs/featured-images/part-$n.png --post_id="$id" --featured_image \
    --title="OpenCart Mobile App Developer Guide Part $n featured image" \
    --alt="$(wp post get "$id" --field=post_title)"
done
```

## Regenerating

The images are drawn as HTML and rendered with headless Chrome:

```bash
cd docs && npm run build:images
```

Titles, section labels, icons (Bootstrap Icons) and the two accent colours for each part are set in the `PARTS` list at the top of `build.cjs`.
