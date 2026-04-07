# KOH HOUSE — Client Guide

A simple reference for managing your KOH HOUSE website. No technical knowledge needed.

---

## Logging In

1. Go to **your-site.netlify.app/admin** (or your custom domain **/admin**)
2. Enter your email address and password
3. Click **Sign In**

You will land on the Dashboard. Use the left sidebar to navigate between sections.

> **Forgot your password?** Contact your developer — the password is set in your hosting environment and cannot be self-reset.

---

## Adding a New Artwork

1. Click **Artworks** in the sidebar
2. Click the **Add Artwork** button (top right)
3. Fill in the form:
   - **Title** — the name of the artwork
   - **Artist** — select from the dropdown (artist must be added first)
   - **Genre** — painting, photography, sculpture, etc.
   - **Medium** — oil on canvas, watercolour, etc.
   - **Dimensions** — e.g. 60 × 80 cm
   - **Edition** — leave blank for originals; use "1/10" for limited prints
   - **Price** — enter the number only (e.g. 1200), no £ sign
   - **Available** — toggle on if the artwork is for sale
   - **Image URL** — paste a direct link to the image
   - **Description** — a short paragraph about the work
4. Click **Save Artwork**

The artwork appears in the shop immediately.

---

## Editing an Artwork

1. Click **Artworks** in the sidebar
2. Find the artwork in the table — use the search box or genre filter to narrow it down
3. Click the **Edit** button (pencil icon) on the right
4. Make your changes
5. Click **Save Artwork**

---

## Marking an Artwork as Available Again

If an artwork was sold and you want to re-list it (e.g. a new print run):

1. Click **Artworks** in the sidebar
2. Find the artwork in the table
3. Click the **Mark Available** button (tag icon) on the right

The artwork status changes to Available and it reappears in the shop.

Alternatively, open the artwork via **Edit** and toggle the **Available** switch on.

---

## Adding or Editing an Artist

**To add a new artist:**

1. Click **Artists** in the sidebar
2. Click **Add Artist**
3. Fill in:
   - **Name** — full name as it should appear on the site
   - **Nationality** — e.g. British, Italian, Ghanaian
   - **Speciality** — e.g. Oil Painting, Photography
   - **Short Bio** — one sentence shown on the artists listing page
   - **Full Bio** — longer biography shown on the artist's individual page
   - **Image URL** — paste a direct link to a portrait or studio photo
4. Click **Save Artist**

**To edit an existing artist:**

1. Click **Artists** in the sidebar
2. Find the artist card and click **Edit**
3. Make your changes and click **Save Artist**

---

## Updating Homepage Slides

The homepage hero carousel can hold multiple slides.

**To add a slide:**

1. Click **Homepage** in the sidebar
2. Scroll to the **Hero Slides** section
3. Click **Add Slide**
4. Fill in:
   - **Image URL** — a full-width landscape image (recommended 1600 × 900px)
   - **Headline** — large bold text on the slide
   - **Subtext** — smaller italic text beneath the headline
   - **Button Label** — text on the call-to-action button (e.g. "View Collection")
   - **Button Link** — where the button goes (e.g. `/shop.html`)
5. Click **Save Slide**

**To reorder slides:** drag and drop the slides in the list to change their order.

**To edit or delete a slide:** click the edit or delete icons on each slide row.

---

## Updating Contact Details

Contact details (address, phone, email) appear in the website footer and on the Contact page. They are managed from Settings.

1. Click **Settings** in the sidebar
2. Scroll to the **Contact Details** section
3. Update the address, phone number, and email address
4. Click **Save Settings**

Changes appear in the footer and contact page automatically.

---

## What Happens When You Save

- Changes are saved to the site's GitHub repository (the file that powers the website)
- Netlify detects the change and rebuilds the site automatically
- **Your changes are typically live within 30–60 seconds**
- You will see a green confirmation toast in the admin panel when the save is successful

If a save fails, a red error message will appear. Try again — if the problem persists, contact your developer.

---

## Managing Featured Artworks and Artists

The homepage shows up to 6 featured artworks and 6 featured artists.

**To change which artworks are featured:**

1. Click **Homepage** in the sidebar
2. Scroll to **Featured Artworks**
3. Tick the artworks you want to feature (maximum 6)
4. Click **Save Homepage**

**To change which artists are featured:**

1. Scroll to **Featured Artists** on the same page
2. Tick up to 6 artists
3. Click **Save Homepage**

---

## Changing the Site Colours

1. Click **Settings** in the sidebar
2. Under **Appearance**, use the colour pickers to adjust:
   - **Accent Colour** — the gold/highlight colour used for buttons and accents
   - **Primary Background** — the main background colour
3. A live preview updates as you pick
4. Click **Save Settings**

---

## Who to Contact for Help

For anything technical — broken pages, new features, deployment issues, or billing questions — contact your developer.

For day-to-day content changes (artworks, artists, homepage) you can manage everything yourself through the admin panel at **/admin**.
