# MBHUB CMS Dashboard

A modern Next.js dashboard for MBHUB CMS with:

- Mobile-first responsive design
- Login system with secure token cookie
- MongoDB integration for contact submissions
- Support for retrieving `contacts` from `atlanticdunes`, `adrobiofarm`, and `mouhibhub` databases

## Setup

1. Copy `.env.example` to `.env.local`
2. Update `MONGODB_URI`, `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`
3. Install dependencies:

```bash
npm install
```

4. Run development server:

```bash
npm run dev
```

5. Seed sample contact data and the initial admin user:

```bash
npm run seed
```

6. Open http://localhost:3000

## Development login

The seed script creates the admin user in the `mouhibhub` database:

- `admin@mnhub.com`
- `ChangeMe123!`



**MongoDB Compass Architecture Comparison Report**

**Scope**
This report compares the current architecture of the `adrobiofarm` and `atlanticdunes` databases based on:
- collection names
- database statistics
- schema samples for boutique-related collections
- available index information

**Overall conclusion**

The two databases are **similar in business purpose** but **not identical in architecture**.  
They share the same broad application domains, but they differ significantly in the boutique model, document shape, and index strategy.

If your goal is a **single high-quality, identical model architecture**, the databases are **not aligned yet**.

**High-level database comparison**

| Area | `adrobiofarm` | `atlanticdunes` | Match |
|---|---|---|---|
| Number of collections | 12 | 12 | Yes |
| Views | 0 | 0 | Yes |
| Objects | 85 | 148 | No |
| Average document size | ~7.3 KB | ~62.1 KB | No |
| Data size | ~620 KB | ~9.2 MB | No |
| Storage size | ~2.2 MB | ~32.2 MB | No |
| Index count | 23 | 15 | No |

**Interpretation**
- `atlanticdunes` stores **larger documents** and more total data.
- `adrobiofarm` has **more indexes**, which suggests a more heavily indexed or more query-specialized structure.
- Both databases are small in absolute size, but their modeling patterns are clearly different.

**Collection architecture comparison**

The databases share many of the same domain areas:

- `services`
- `news`
- `newsCategories`
- `products`
- `poles`
- `contacts`
- `entrepriseInfo`
- `images`
- `images.files`
- `images.chunks`
- `boutiqueCategories`

**Main structural difference**
- `adrobiofarm` uses `boutiqueProducts`
- `atlanticdunes` uses `boutique`

That means the boutique domain is modeled differently at the collection level.

**Boutique schema comparison**

**`adrobiofarm.boutiqueProducts`**
- Sampled schema contains **12 fields**
- Main fields observed:
  - `_id`
  - `slug`
  - `title`
  - `category`
  - `subcategory`
  - `excerpt`
  - `description`
  - `detail`
  - `price`
  - `stock`
  - `image`
  - `tags`

**Architecture characteristics**
- Simpler and more compact
- More normalized-looking field set
- Uses fewer product attributes
- No obvious explicit reference fields in the sampled schema for category IDs or subcategory IDs

**`atlanticdunes.boutique`**
- Sampled schema contains **28 fields**
- Main fields observed:
  - `_id`
  - `slug`
  - `title`
  - `shortDescription`
  - `description`
  - `details`
  - `specs`
  - `price`
  - `availability`
  - `inStock`
  - `pole`
  - `poleId`
  - `domain`
  - `domainId`
  - `image`
  - `boutiqueCategoryId`
  - `boutiqueSubcategoryId`
  - `createdAt`
  - `updatedAt`
  - `sku`
  - `unitPrice`
  - `currency`
  - `inventoryCount`
  - `gallery`
  - `warranty`
  - `tags`
  - `featured`
  - `status`

**Architecture characteristics**
- Much richer document model
- More embedded business metadata
- More explicit relationship-style fields
- More denormalized presentation fields
- Better suited to a fuller product/catalog experience

**Boutique categories comparison**

**`adrobiofarm.boutiqueCategories`**
- Sampled schema contains **7 fields**
- Fields observed:
  - `_id`
  - `slug`
  - `label`
  - `description`
  - `subcategories`
  - `createdAt`
  - `updatedAt`

**`atlanticdunes.boutiqueCategories`**
- Sampled schema contains **7 fields**
- Fields observed:
  - `_id`
  - `slug`
  - `label`
  - `description`
  - `subcategories`
  - `createdAt`
  - `updatedAt`

**Category schema result**
- The `boutiqueCategories` documents are **structurally aligned** in both databases.
- This is one of the strongest matches between the two databases.

**Index strategy comparison**

**`adrobiofarm.boutiqueProducts`**
- `_id_`
- `slug_1`

**`adrobiofarm.boutiqueCategories`**
- `_id_`
- `slug_1`

**`atlanticdunes.boutiqueCategories`**
- `_id_`
- `slug_1`

**Index observations**
- `boutiqueCategories` indexing is **consistent** between the two databases.
- `adrobiofarm.boutiqueProducts` has a minimal index set.
- I was not able to complete a matching index retrieval for `atlanticdunes.boutique` in this run, so a full boutique-to-boutique index equivalence check is still incomplete.
- Based on the schema richness, `atlanticdunes.boutique` is likely designed for a more complex access pattern than `adrobiofarm.boutiqueProducts`.

**Relationship strategy comparison**

**`adrobiofarm`**
- Appears to use a simpler boutique model
- Category and subcategory are stored as string fields
- Relationship strategy is lighter-weight and more compact

**`atlanticdunes`**
- Uses explicit relationship-style fields such as:
  - `boutiqueCategoryId`
  - `boutiqueSubcategoryId`
  - `poleId`
  - `domainId`
- Also stores both identifier-style and display-style fields
- This indicates a more hybrid model:
  - references for structure
  - embedded values for display convenience

**Relationship strategy result**
- The two databases do **not** match.
- `atlanticdunes` is more explicit and richer in its relationships.

**Media storage strategy comparison**

Both databases use:
- `images`
- `images.files`
- `images.chunks`

This strongly suggests both use **GridFS-style media storage**.

**Media strategy result**
- This part of the architecture **matches well at the database level**.
- However, at the document level:
  - `atlanticdunes.boutique` includes a `gallery` array
  - `adrobiofarm.boutiqueProducts` only shows a single `image` field in the sampled schema

So while the storage backend is aligned, the **document usage pattern is not identical**.

**Validation rules**
- Validation rules were **not inspected yet**.
- Therefore, no conclusion can be made about whether validation rules match.
- This is an important remaining step if your goal is a fully identical architecture.

**Architecture quality assessment**

**`adrobiofarm`**
- More compact
- Simpler boutique model
- Fewer fields per product document
- More indexes overall
- Likely easier to maintain, but less expressive

**`atlanticdunes`**
- More complete and expressive
- Larger document payloads
- More explicit references
- More presentation-ready structure
- Likely better for a richer application experience, but more complex

**Do they match all the “high quality” criteria?**

| Criterion | Match? | Notes |
|---|---|---|
| Same collection names | No | `boutique` vs `boutiqueProducts` |
| Same document shape | No | 28 fields vs 12 fields in boutique product model |
| Same relationship strategy | No | `atlanticdunes` is more explicit and richer |
| Same index strategy | Partial | `boutiqueCategories` matches; boutique collection index parity not fully confirmed |
| Same media storage strategy | Partial | Same GridFS collections, but different usage pattern |
| Same validation rules | Unknown | Not yet inspected |

**Final assessment**
The databases are **functionally similar**, but they are **not yet architecturally identical**.

The biggest differences are:
- the boutique collection naming
- the boutique document structure
- the relationship strategy
- the document richness in `atlanticdunes`

**Recommended direction**
If you want to turn them into one identical model, you should first choose one canonical boutique design:

- **Option A: simpler canonical model**
  - Align `atlanticdunes` toward `adrobiofarm`
  - Good if you want fewer fields and simpler maintenance

- **Option B: richer canonical model**
  - Align `adrobiofarm` toward `atlanticdunes`
  - Good if you want a more complete, future-proof catalog structure

**Best next step**
To complete the architecture report properly, the next logical inspection would be:
- validation rules
- full index lists for `atlanticdunes.boutique`
- sample documents from both boutique collections
- then a final migration blueprint for unifying them

If you want, I can turn this into a **cleaner executive-style report** or a **technical migration report**.**MongoDB Compass Architecture Comparison Report**

**Scope**
This report compares the current architecture of the `adrobiofarm` and `atlanticdunes` databases based on:
- collection names
- database statistics
- schema samples for boutique-related collections
- available index information

**Overall conclusion**

The two databases are **similar in business purpose** but **not identical in architecture**.  
They share the same broad application domains, but they differ significantly in the boutique model, document shape, and index strategy.

If your goal is a **single high-quality, identical model architecture**, the databases are **not aligned yet**.

**High-level database comparison**

| Area | `adrobiofarm` | `atlanticdunes` | Match |
|---|---|---|---|
| Number of collections | 12 | 12 | Yes |
| Views | 0 | 0 | Yes |
| Objects | 85 | 148 | No |
| Average document size | ~7.3 KB | ~62.1 KB | No |
| Data size | ~620 KB | ~9.2 MB | No |
| Storage size | ~2.2 MB | ~32.2 MB | No |
| Index count | 23 | 15 | No |

**Interpretation**
- `atlanticdunes` stores **larger documents** and more total data.
- `adrobiofarm` has **more indexes**, which suggests a more heavily indexed or more query-specialized structure.
- Both databases are small in absolute size, but their modeling patterns are clearly different.

**Collection architecture comparison**

The databases share many of the same domain areas:

- `services`
- `news`
- `newsCategories`
- `products`
- `poles`
- `contacts`
- `entrepriseInfo`
- `images`
- `images.files`
- `images.chunks`
- `boutiqueCategories`

**Main structural difference**
- `adrobiofarm` uses `boutiqueProducts`
- `atlanticdunes` uses `boutique`

That means the boutique domain is modeled differently at the collection level.

**Boutique schema comparison**

**`adrobiofarm.boutiqueProducts`**
- Sampled schema contains **12 fields**
- Main fields observed:
  - `_id`
  - `slug`
  - `title`
  - `category`
  - `subcategory`
  - `excerpt`
  - `description`
  - `detail`
  - `price`
  - `stock`
  - `image`
  - `tags`

**Architecture characteristics**
- Simpler and more compact
- More normalized-looking field set
- Uses fewer product attributes
- No obvious explicit reference fields in the sampled schema for category IDs or subcategory IDs

**`atlanticdunes.boutique`**
- Sampled schema contains **28 fields**
- Main fields observed:
  - `_id`
  - `slug`
  - `title`
  - `shortDescription`
  - `description`
  - `details`
  - `specs`
  - `price`
  - `availability`
  - `inStock`
  - `pole`
  - `poleId`
  - `domain`
  - `domainId`
  - `image`
  - `boutiqueCategoryId`
  - `boutiqueSubcategoryId`
  - `createdAt`
  - `updatedAt`
  - `sku`
  - `unitPrice`
  - `currency`
  - `inventoryCount`
  - `gallery`
  - `warranty`
  - `tags`
  - `featured`
  - `status`

**Architecture characteristics**
- Much richer document model
- More embedded business metadata
- More explicit relationship-style fields
- More denormalized presentation fields
- Better suited to a fuller product/catalog experience

**Boutique categories comparison**

**`adrobiofarm.boutiqueCategories`**
- Sampled schema contains **7 fields**
- Fields observed:
  - `_id`
  - `slug`
  - `label`
  - `description`
  - `subcategories`
  - `createdAt`
  - `updatedAt`

**`atlanticdunes.boutiqueCategories`**
- Sampled schema contains **7 fields**
- Fields observed:
  - `_id`
  - `slug`
  - `label`
  - `description`
  - `subcategories`
  - `createdAt`
  - `updatedAt`

**Category schema result**
- The `boutiqueCategories` documents are **structurally aligned** in both databases.
- This is one of the strongest matches between the two databases.

**Index strategy comparison**

**`adrobiofarm.boutiqueProducts`**
- `_id_`
- `slug_1`

**`adrobiofarm.boutiqueCategories`**
- `_id_`
- `slug_1`

**`atlanticdunes.boutiqueCategories`**
- `_id_`
- `slug_1`

**Index observations**
- `boutiqueCategories` indexing is **consistent** between the two databases.
- `adrobiofarm.boutiqueProducts` has a minimal index set.
- I was not able to complete a matching index retrieval for `atlanticdunes.boutique` in this run, so a full boutique-to-boutique index equivalence check is still incomplete.
- Based on the schema richness, `atlanticdunes.boutique` is likely designed for a more complex access pattern than `adrobiofarm.boutiqueProducts`.

**Relationship strategy comparison**

**`adrobiofarm`**
- Appears to use a simpler boutique model
- Category and subcategory are stored as string fields
- Relationship strategy is lighter-weight and more compact

**`atlanticdunes`**
- Uses explicit relationship-style fields such as:
  - `boutiqueCategoryId`
  - `boutiqueSubcategoryId`
  - `poleId`
  - `domainId`
- Also stores both identifier-style and display-style fields
- This indicates a more hybrid model:
  - references for structure
  - embedded values for display convenience

**Relationship strategy result**
- The two databases do **not** match.
- `atlanticdunes` is more explicit and richer in its relationships.

**Media storage strategy comparison**

Both databases use:
- `images`
- `images.files`
- `images.chunks`

This strongly suggests both use **GridFS-style media storage**.

**Media strategy result**
- This part of the architecture **matches well at the database level**.
- However, at the document level:
  - `atlanticdunes.boutique` includes a `gallery` array
  - `adrobiofarm.boutiqueProducts` only shows a single `image` field in the sampled schema

So while the storage backend is aligned, the **document usage pattern is not identical**.

**Validation rules**
- Validation rules were **not inspected yet**.
- Therefore, no conclusion can be made about whether validation rules match.
- This is an important remaining step if your goal is a fully identical architecture.

**Architecture quality assessment**

**`adrobiofarm`**
- More compact
- Simpler boutique model
- Fewer fields per product document
- More indexes overall
- Likely easier to maintain, but less expressive

**`atlanticdunes`**
- More complete and expressive
- Larger document payloads
- More explicit references
- More presentation-ready structure
- Likely better for a richer application experience, but more complex

**Do they match all the “high quality” criteria?**

| Criterion | Match? | Notes |
|---|---|---|
| Same collection names | No | `boutique` vs `boutiqueProducts` |
| Same document shape | No | 28 fields vs 12 fields in boutique product model |
| Same relationship strategy | No | `atlanticdunes` is more explicit and richer |
| Same index strategy | Partial | `boutiqueCategories` matches; boutique collection index parity not fully confirmed |
| Same media storage strategy | Partial | Same GridFS collections, but different usage pattern |
| Same validation rules | Unknown | Not yet inspected |

**Final assessment**
The databases are **functionally similar**, but they are **not yet architecturally identical**.

The biggest differences are:
- the boutique collection naming
- the boutique document structure
- the relationship strategy
- the document richness in `atlanticdunes`

**Recommended direction**
If you want to turn them into one identical model, you should first choose one canonical boutique design:

- **Option A: simpler canonical model**
  - Align `atlanticdunes` toward `adrobiofarm`
  - Good if you want fewer fields and simpler maintenance

- **Option B: richer canonical model**
  - Align `adrobiofarm` toward `atlanticdunes`
  - Good if you want a more complete, future-proof catalog structure

**Best next step**
To complete the architecture report properly, the next logical inspection would be:
- validation rules
- full index lists for `atlanticdunes.boutique`
- sample documents from both boutique collections
- then a final migration blueprint for unifying them

If you want, I can turn this into a **cleaner executive-style report** or a **technical migration report**.