# Hair AI — UI/UX generation prompt kit

A copy-paste kit for generating the app's UI in an AI design tool (v0, Lovable, Galileo,
Uizard, etc.). Reference aesthetic: the **StyleVision "3D Interactive AR Preview"** mockup —
clean salon-tech, soft pastel gradients, a large rendered 3D head hero, circular hairstyle
thumbnail rows, a left icon rail, and a right control panel.

## How to use it

1. Paste the **Master design prompt** once (or into the tool's "style"/"system" field).
2. Then paste the **page prompt** for whatever screen you're generating.
3. Use the **glossary** to describe changes precisely ("make this a segmented control", "add a
   bottom sheet", "use a horizontal scroller of chips").

---

# 1 · Master design prompt (prepend to every page)

> Design a modern, premium **salon hairstyle-visualization app** called **Hair AI**. Audience:
> barbers and salon owners in India using it on phones and tablets, and their walk-in customers.
>
> **Aesthetic:** clean, airy, high-end salon-tech. Soft pastel gradient backgrounds (mint,
> teal, pale peach), generous whitespace, large rounded corners (16–24px), subtle soft shadows,
> and one confident accent color. Think Apple-clean meets a modern barbershop.
>
> **Accent color:** cyan/teal `#00D4FF` with a secondary electric blue `#0099CC` and a violet
> `#8B5CF6` for variety. Success green `#22C55E`, warning amber `#F59E0B`, danger red `#EF4444`.
>
> **Theme:** default **light** (white cards on pale gradient), with a dark-mode variant (near-
> black `#0A0A0A` cards, same accents). [Pick one; the current app is dark, the reference is light.]
>
> **Typography:** clean geometric sans (Inter / Geist). Big bold black headings, muted grey
> secondary text, ALL-CAPS micro-labels for section headers.
>
> **Components:** pill buttons, circular thumbnail cards, horizontal scrollers ("See All"),
> chips, sliders, toggles, dropdowns, a left vertical icon rail on the studio screen, a right
> floating control panel. A fixed **bottom tab bar** (Home · Explore · Scan · Saved · Profile)
> with a raised center Scan button.
>
> **Motion:** smooth spring animations, count-up numbers, gentle hover/press scale, a floating
> interactive 3D head on the studio screen.
>
> **Tone:** confident, friendly, professional. Never childish.

---

# 2 · Page-by-page prompts

### 2.1 · Login / Sign up
> A split auth screen. Left (or top on mobile): the Hair AI logo (scissors mark) and a warm
> headline "Welcome back" / "Create account". A **segmented tab** to switch Log In / Sign Up.
> Fields: email, password (sign-up adds Salon name + Your name). Large primary pill button.
> Below: "No account? Sign up free" link. Clean, minimal, one accent button. Inline field
> validation errors in red.

### 2.2 · Home / Dashboard
> A salon owner's home. Top: greeting ("Good morning") + salon name in a gradient headline, a
> scissors avatar chip. A **2×2 grid of stat counter cards** with animated count-up numbers:
> Completed Customers, In Session (with a live green pulse dot), Average Rating (with stars),
> Top Style. Below: an **"In progress" queue** — horizontal cards of customers currently being
> served, each with Resume and Done buttons. Then a row of 4 **quick-action tiles** (Upload,
> Analysis, Hair Test, Customise) with colored icons. A big gradient **"New customer scan"** CTA
> card. Sections: "Trending today" (live chips), "Recent customers" (list), "Before & after"
> (gallery, coming soon). Fixed bottom tab bar.

### 2.3 · Scan — customer entry
> A short intake form. Header "Customer details". Fields: Customer name (required), Mobile
> number (required, 10-digit), a **Gender chip selector** (Male/Female/Other), a **"Who's
> cutting?" barber chip selector** with an inline "+ Add barber" chip. A **terms & consent
> checkbox** (custom square check). Large "Start Scan →" pill button, disabled until valid.

### 2.4 · Scan — camera capture (4 angles)
> A full-screen camera capture flow. A live camera viewfinder with a face-outline guide overlay.
> A **4-step angle stepper** at top (Front · Left · Right · Back) with progress dots and an
> instruction line ("Turn to show your LEFT side"). A big circular shutter button. Thumbnails of
> captured angles fill in as you go. Option to upload from gallery instead.

### 2.5 · Scan — analysis results
> An AI hair-analysis result screen. Top: customer name + a credits chip. A row of **stat
> bubbles**: gender, skin tone, hair length, texture, density, face shape (each an icon + label
> + value). A "Hair color & current style" card. Then **Hair / Beard tabs**. Under them a
> **grid of hairstyle recommendation cards** — each a photo thumbnail, style name, and a small
> compatibility score badge; a "best match" card is highlighted. Tapping a card opens a detail
> modal. Buttons to generate, and a voice "Hear your analysis" option.

### 2.6 · Customize / AR Studio  ← the StyleVision-style screen
> The hero screen, modeled on the StyleVision mockup. Top: a large **interactive 3D head/model
> preview** floating on a soft gradient, that spins on drag and reacts (bounce/highlight) on tap.
> A left **vertical icon rail** (rotate, zoom, texture, measure, move, lighting, contrast, undo).
> A right **floating control panel** with: Hair Type dropdown, Texture slider, Adjust Angle
> slider, Lighting toggle. Below the 3D area, three **horizontal scroller rows** of circular
> hairstyle thumbnail cards, each row with a "See All": **Front Hairstyles**, **Side Profiles**,
> **Back Hairstyles** — selecting a card highlights it with an accent ring and updates the 3D
> head. A **search bar** to find styles, and a **drag-and-drop reference board** to drop a
> reference photo. A big gradient **"Generate Custom Style"** button at the bottom. When a style
> is chosen for all three angles, it renders onto the model.

### 2.7 · Style detail (angle views)
> A bottom-sheet / modal for one chosen style. A large front image that opens **full-screen on
> tap** (with a Save/download button). Below it a **2×2 grid** of angle views (Front, Left,
> Right, Back) — empty cells say "tap to add" and generate on demand; a "Generate the other
> angles" button fills them. Each image has a Save button. A summary line and barber
> instructions. Optional 360° GIF.

### 2.8 · Hair Health quiz
> A friendly multi-step questionnaire (concern, wash frequency, water type, diet, stress, scalp
> condition) using chip selectors and sliders, one question per card with a progress bar. Result
> screen: a diagnosis card, 3 remedy cards, and 4 recommended product cards (name, brand, price
> range, "why it helps", a buy/search link).

### 2.9 · Analytics
> A salon analytics screen. Same 4 stat counters as home. A **bar chart** "Scans · last 14
> days". A "Most requested styles" list with animated horizontal bars. A **visit history**
> grouped by day (Today / Yesterday / dated) — each row: customer, style, barber, a star rating
> badge, time.

### 2.10 · Admin — salon list (platform owner)
> A platform-admin screen. Header "Salons · N total · M active". A vertical list of **salon
> cards** — each: salon name, a status pill (active/trial/suspended), a mono salon code, city,
> and "X customers · Y scans", with a chevron. Tapping opens the detail. A logout button.

### 2.11 · Admin — salon detail
> One salon's dashboard. Back link "‹ All salons". Header: salon name + status pill + code/city/
> email. A 2×2 stat grid (Customers, Total scans, Completed, Avg rating). A **"Scans · last 14
> days" bar chart**. A "Most requested styles" bar list. A **Customers list** and a **Recent
> visits** list.

### 2.12 · Profile
> Salon profile & settings. Editable salon name, city, email (disabled). Navigation rows with
> chevrons: **Appointments**, **Analytics**. Info rows: subscription plan, data & privacy,
> support. A red "Sign out" button.

### 2.13 · Appointments
> A bookings screen. Filter chips: Upcoming / Today / Past. Currently an **empty state** — a
> calendar icon, "No appointments yet", and a note that WhatsApp bookings will appear here.

### 2.14 · Saved
> A gallery of saved looks — a masonry/grid of generated hairstyle images, each with the style
> name and a save/share action.

---

# 3 · UI/UX glossary (terms to use with the AI)

### Layout & structure
- **Hero / hero section** — the big top area of a page (here: the 3D head + headline).
- **Above the fold** — what's visible without scrolling.
- **Rail / side rail** — a thin vertical strip of icons (the studio's left toolbar).
- **Sidebar / drawer** — a panel that slides in from an edge.
- **Bottom tab bar / bottom navigation** — the fixed row of nav icons at the bottom of a mobile app.
- **FAB (floating action button)** — a raised circular button (here: the center Scan button).
- **Panel** — a floating grouped control area (the right-side Hair Type/Texture/Lighting box).
- **Grid / masonry** — items in rows/columns; masonry = staggered heights.
- **Whitespace / negative space** — empty breathing room around elements.
- **Responsive / breakpoint** — layout that adapts to screen size; a breakpoint is where it changes.
- **Viewport** — the visible screen area.

### Components
- **Card** — a rounded container with a shadow holding one thing.
- **Chip / pill** — a small rounded tag or toggle (gender, barber, filters).
- **Thumbnail** — a small preview image (the circular hairstyle cards).
- **Segmented control** — a joined row of toggle buttons where one is active (Log In / Sign Up).
- **Horizontal scroller / carousel** — a swipeable row of cards with a "See All".
- **Slider** — a draggable track for a value (Texture, Adjust Angle).
- **Toggle / switch** — an on/off control (Lighting).
- **Dropdown / select** — a tap-to-open list (Hair Type).
- **Stepper** — a multi-step progress indicator (the 4-angle capture).
- **Accordion** — expandable/collapsible sections.
- **Avatar** — a small circular profile image.
- **Badge** — a tiny status label (compatibility score, "best match", rating star).
- **Tooltip** — a small hover/press hint.
- **Input field / form field** — a text entry box.
- **Primary / secondary / ghost button** — filled accent / outlined / text-only button.

### Overlays & feedback
- **Modal / dialog** — a centered pop-up over a dimmed background.
- **Bottom sheet** — a panel that slides up from the bottom (good for the style detail on mobile).
- **Toast / snackbar** — a small temporary message.
- **Skeleton loader** — grey placeholder shapes while content loads.
- **Empty state** — the friendly "nothing here yet" screen (Appointments).
- **Spinner / progress indicator** — a loading animation.
- **Inline validation** — error text under a field.

### Visual style
- **Gradient** — a smooth color blend (the pastel backgrounds).
- **Glassmorphism** — frosted, semi-transparent blurred panels.
- **Neumorphism** — soft "extruded" shadows (use sparingly).
- **Elevation / shadow** — how "lifted" a card looks.
- **Accent color** — the one signature color (`#00D4FF`).
- **Typography scale** — the set of text sizes from big headings to micro-labels.
- **Micro-label** — a tiny ALL-CAPS section header.

### Motion
- **Spring animation** — bouncy, natural movement.
- **Count-up** — numbers animating from 0 to their value (stat counters).
- **Press/hover scale** — element gently shrinks/grows on interaction.
- **Parallax** — layers moving at different speeds for depth.

### 3D terms (for the studio hero)
- **Mesh / model** — the 3D object (the head).
- **Texture** — an image wrapped onto a 3D surface.
- **Orbit controls** — drag-to-rotate / pinch-to-zoom a 3D view.
- **Render** — the drawn 3D image.
- **Billboard** — a flat image that always faces the camera (a cheap "2.5D" trick).
- **glTF / .glb** — the standard 3D model file format for the web.
- **Ambient / key light** — soft fill light / main directional light in a 3D scene.

---

# 4 · Prompting tips for AI UI tools

- **One screen at a time.** Paste the master prompt + one page prompt; don't ask for the whole app at once.
- **Name the components** using the glossary ("a horizontal scroller of circular thumbnail chips with a See All link").
- **Specify states**: default, hover/press, selected, loading (skeleton), empty, error.
- **Give the accent color and radius** every time (`#00D4FF`, 16–24px corners) — tools drift otherwise.
- **Say the device**: "mobile-first, 390px wide" or "tablet, 1024px" so layout matches.
- **Reference the mockup**: "match the StyleVision AR Studio layout — 3D head hero, left icon
  rail, right control panel, three horizontal hairstyle rows below."
