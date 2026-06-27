export type RelationField = {
  collection: 'poles' | 'domains' | 'newsCategories' | 'boutiqueCategories' | 'images';
  labelField?: 'label' | 'slug' | 'id' | 'filename';
  valueField?: 'slug' | 'id' | '_id';
  multi?: boolean;
};

export type AtlanticDunesField = {
  name: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'slug'
    | 'stringArray'
    | 'objectArray'
    | 'select'
    | 'multiSelect'
    | 'boolean'
    | 'date'
    | 'number';
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  relation?: RelationField;
  itemLabel?: string;
  itemFields?: Array<{ name: string; label: string; type: 'text' | 'number' | 'textarea' | 'slug'; required?: boolean; description?: string }>;
};

export type AtlanticDunesCollectionSchema = {
  collection: string;
  label: string;
  description: string;
  idField: 'slug' | 'id' | '_id';
  singleton?: boolean;
  fields: AtlanticDunesField[];
};

export const collectionSchemas: Record<string, AtlanticDunesCollectionSchema> = {
  poles: {
    collection: 'poles',
    label: 'Poles',
    description: 'Business poles used to classify services and products. Products and services share poles, but each can have its own nested domains.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique identifier used in URLs.' },
      { name: 'label', label: 'Label', type: 'text', required: true, description: 'Display name shown on the website.' },
      { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true, description: 'A brief description for navigation cards.' },
      {
        name: 'productDomains',
        label: 'Product domains',
        type: 'objectArray',
        itemLabel: 'Domain',
        itemFields: [
          { name: 'label', label: 'Label', type: 'text', required: true, description: 'Display name shown on the website.' },
          { name: 'description', label: 'Description', type: 'textarea', description: 'Optional description for this product domain.' },
        ],
        description: 'List of product domains nested under this pole. Slugs are generated automatically from the label.',
      },
      {
        name: 'serviceDomains',
        label: 'Service domains',
        type: 'objectArray',
        itemLabel: 'Domain',
        itemFields: [
          { name: 'label', label: 'Label', type: 'text', required: true, description: 'Display name shown on the website.' },
          { name: 'description', label: 'Description', type: 'textarea', description: 'Optional description for this service domain.' },
        ],
        description: 'List of service domains nested under this pole. Slugs are generated automatically from the label.',
      },
    ],
  },
  domains: {
    collection: 'domains',
    label: 'Domains',
    description: 'Domains used to group services and products.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique identifier used in URLs.' },
      { name: 'label', label: 'Label', type: 'text', required: true, description: 'Display name shown to users.' },
      { name: 'description', label: 'Description', type: 'textarea', required: true, description: 'A short description of this domain.' },
    ],
  },
  newsCategories: {
    collection: 'newsCategories',
    label: 'News categories',
    description: 'Categories used by news articles.',
    idField: '_id',
    fields: [
      { name: 'slug', label: 'Category ID', type: 'slug', required: true, description: 'Unique category identifier generated from label.' },
      { name: 'label', label: 'Label', type: 'text', required: true, description: 'Category display name.' },
      { name: 'description', label: 'Description', type: 'textarea', required: true, description: 'What this news category is for.' },
      {
        name: 'subcategories',
        label: 'Subcategories',
        type: 'objectArray',
        itemLabel: 'Subcategory',
        itemFields: [
          { name: 'label', label: 'Label', type: 'text', required: true, description: 'Display name for the subcategory.' },
        ],
        description: 'Nested news subcategories grouped under this news category. Slug is generated automatically from label.',
      },
    ],
  },
  services: {
    collection: 'services',
    label: 'Services',
    description: 'Service pages with methodology, deliverables and taxonomy.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique service identifier.' },
      { name: 'title', label: 'Title', type: 'text', required: true, description: 'Service title shown on the website.' },
      { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true, description: 'A brief intro summary.' },
      { name: 'description', label: 'Description', type: 'textarea', required: true, description: 'Full service description.' },
      { name: 'methodology', label: 'Methodology steps', type: 'stringArray', required: true, description: 'A list of methodology or approach steps.' },
      { name: 'deliverable', label: 'Deliverable', type: 'textarea', required: true, description: 'The output customers receive from this service.' },
      { name: 'poleId', label: 'Pole', type: 'select', required: true, relation: { collection: 'poles', labelField: 'label', valueField: 'slug' }, description: 'Select the pole that this service belongs to.' },
      { name: 'domainId', label: 'Domain', type: 'select', required: true, relation: { collection: 'domains', labelField: 'label', valueField: 'slug' }, description: 'Select the domain that this service belongs to.' },
      { name: 'featured', label: 'Featured', type: 'boolean', description: 'Highlight this service on the website if enabled.' },
      { name: 'tags', label: 'Tags', type: 'stringArray', description: 'Add keywords for filtering and search.' },
      { name: 'imageId', label: 'Image', type: 'select', relation: { collection: 'images', labelField: 'filename', valueField: '_id' }, description: 'Choose an image asset for this service.' },
    ],
  },
  products: {
    collection: 'products',
    label: 'Products',
    description: 'Product listings with specs, pricing and categories.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique product identifier.' },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'specs', label: 'Specification rows', type: 'objectArray', itemLabel: 'Spec', itemFields: [
          { name: 'label', label: 'Label', type: 'text' },
          { name: 'value', label: 'Value', type: 'text' },
        ], description: 'List product specification rows.' },
      { name: 'performance', label: 'Performance summary', type: 'textarea' },
      { name: 'poleId', label: 'Pole', type: 'select', required: true, relation: { collection: 'poles', labelField: 'label', valueField: 'slug' } },
      { name: 'domainId', label: 'Domain', type: 'select', required: true, relation: { collection: 'domains', labelField: 'label', valueField: 'slug' } },
      { name: 'imageId', label: 'Image', type: 'select', relation: { collection: 'images', labelField: 'filename', valueField: '_id' }, description: 'Select the main product image.' },
    ],
  },
  boutique: {
    collection: 'boutique',
    label: 'Boutique items',
    description: 'Boutique catalog items organized by boutique categories and subcategories.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'category', label: 'Category', type: 'select', required: true, relation: { collection: 'boutiqueCategories', labelField: 'label', valueField: 'slug' }, description: 'Select the boutique category for this item.' },
      { name: 'subcategory', label: 'Subcategory', type: 'select', description: 'Select the boutique subcategory for the chosen category.' },
      { name: 'details', label: 'Details', type: 'stringArray', description: 'Key product features and details.' },
      { name: 'specs', label: 'Specification rows', type: 'objectArray', itemLabel: 'Spec', itemFields: [
          { name: 'label', label: 'Label', type: 'text' },
          { name: 'value', label: 'Value', type: 'text' },
        ], description: 'Product spec table rows.' },
      { name: 'price', label: 'Price', type: 'text', required: true, description: 'Display price string like "18 900 €".' },
      { name: 'inStock', label: 'In stock', type: 'boolean', required: true, description: 'Mark this item as available in stock.' },
      { name: 'imageId', label: 'Image', type: 'select', relation: { collection: 'images', labelField: 'filename', valueField: '_id' }, description: 'Main product image.' },
    ],
  },
  news: {
    collection: 'news',
    label: 'News articles',
    description: 'News and announcements published on the site.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'date', label: 'Display date', type: 'date', required: false, description: 'Auto-generated as today\'s date.' },
      { name: 'publishedAt', label: 'Published at', type: 'date', required: false, description: 'Auto-generated as today\'s date.' },
      { name: 'categoryId', label: 'Category', type: 'select', required: true, relation: { collection: 'newsCategories', labelField: 'label', valueField: 'slug' } },
      { name: 'subcategory', label: 'Subcategory', type: 'select', description: 'Select the news subcategory for the chosen category.' },
      { name: 'summary', label: 'Summary', type: 'textarea', required: true },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea', description: 'Short preview text for listings.' },
      { name: 'author', label: 'Author', type: 'text', description: 'Article author name.' },
      { name: 'tags', label: 'Tags', type: 'stringArray', description: 'Add article tags.' },
      { name: 'status', label: 'Status', type: 'select', options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
        ], description: 'Article publication status.' },
      { name: 'content', label: 'Content paragraphs', type: 'stringArray', required: true, description: 'Each paragraph of the news article.' },
      { name: 'imageId', label: 'Image', type: 'select', relation: { collection: 'images', labelField: 'filename', valueField: '_id' }, description: 'Image used for the article.' },
    ],
  },
  entrepriseInfo: {
    collection: 'entrepriseInfo',
    label: 'Enterprise info',
    description: 'Contact information for the company.',
    idField: '_id',
    singleton: true,
    fields: [
      { name: 'email', label: 'Email', type: 'text', required: true },
      { name: 'phones', label: 'Phone numbers', type: 'stringArray', required: true, description: 'Company phone numbers.' },
      { name: 'fax', label: 'Fax number', type: 'text', description: 'Optional fax number.' },
      { name: 'addressLines', label: 'Address lines', type: 'stringArray', required: true, description: 'Postal address lines.' },
    ],
  },
};

const adrobiofarmCollectionSchemas: Record<string, AtlanticDunesCollectionSchema> = {
  poles: {
    collection: 'poles',
    label: 'Poles',
    description: 'Business poles used to classify services, products, and boutique offerings. Products and services share poles, but each can have its own nested domains.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique identifier used in URLs.' },
      { name: 'label', label: 'Label', type: 'text', required: true, description: 'Display name for the pole.' },
      { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true, description: 'A brief summary of the pole.' },
      {
        name: 'productDomains',
        label: 'Product domains',
        type: 'objectArray',
        itemLabel: 'Domain',
        itemFields: [
          { name: 'label', label: 'Label', type: 'text', required: true, description: 'Display name shown on the website.' },
          { name: 'description', label: 'Description', type: 'textarea', description: 'Optional description for this product domain.' },
        ],
        description: 'List of product domains nested under this pole. Slugs are generated automatically from the label.',
      },
      {
        name: 'serviceDomains',
        label: 'Service domains',
        type: 'objectArray',
        itemLabel: 'Domain',
        itemFields: [
          { name: 'label', label: 'Label', type: 'text', required: true, description: 'Display name shown on the website.' },
          { name: 'description', label: 'Description', type: 'textarea', description: 'Optional description for this service domain.' },
        ],
        description: 'List of service domains nested under this pole. Slugs are generated automatically from the label.',
      },
    ],
  },
  products: {
    collection: 'products',
    label: 'Products',
    description: 'Product offers linked to a pole and domain.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique product identifier.' },
      { name: 'title', label: 'Title', type: 'text', required: true, description: 'Product title shown on the website.' },
      { name: 'pole', label: 'Pole', type: 'select', required: true, relation: { collection: 'poles', labelField: 'label', valueField: 'slug' }, description: 'Select the pole that this product belongs to.' },
      { name: 'domain', label: 'Domain', type: 'select', required: true, relation: { collection: 'domains', labelField: 'label', valueField: 'slug' }, description: 'Select the domain that this product belongs to.' },
      { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'features', label: 'Features', type: 'stringArray', description: 'Key product features.' },
      { name: 'stock', label: 'Stock', type: 'text', description: 'Stock status label.' },
      { name: 'image', label: 'Image', type: 'select', relation: { collection: 'images', labelField: 'filename', valueField: '_id' }, description: 'Select the main product image.' },
      { name: 'tags', label: 'Tags', type: 'stringArray', description: 'Optional product tags.' },
    ],
  },
  services: {
    collection: 'services',
    label: 'Services',
    description: 'Service offers linked to a pole and domain.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique service identifier.' },
      { name: 'title', label: 'Title', type: 'text', required: true, description: 'Service title shown on the website.' },
      { name: 'pole', label: 'Pole', type: 'select', required: true, relation: { collection: 'poles', labelField: 'label', valueField: 'slug' }, description: 'Select the pole that this service belongs to.' },
      { name: 'domain', label: 'Domain', type: 'select', required: true, relation: { collection: 'domains', labelField: 'label', valueField: 'slug' }, description: 'Select the domain that this service belongs to.' },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'methodology', label: 'Methodology', type: 'stringArray', required: true, description: 'Methodology steps for this service.' },
      { name: 'deliverables', label: 'Deliverables', type: 'stringArray', required: true, description: 'Deliverables customers receive.' },
      { name: 'imageId', label: 'Image', type: 'select', relation: { collection: 'images', labelField: 'filename', valueField: '_id' }, description: 'Choose the main service image from the gallery.' },
      { name: 'tags', label: 'Tags', type: 'stringArray', description: 'Optional service tags.' },
    ],
  },
  boutique: {
    collection: 'boutiqueProducts',
    label: 'Boutique items',
    description: 'Boutique catalog items organized by boutique categories and subcategories.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique boutique product identifier.' },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'category', label: 'Category', type: 'select', required: true, relation: { collection: 'boutiqueCategories', labelField: 'label', valueField: 'slug' }, description: 'Select the boutique category for this item.' },
      { name: 'subcategory', label: 'Subcategory', type: 'select', description: 'Select the boutique subcategory for the chosen category.' },
      { name: 'details', label: 'Details', type: 'stringArray', description: 'Key product features and details.' },
      { name: 'specs', label: 'Specification rows', type: 'objectArray', itemLabel: 'Spec', itemFields: [
          { name: 'label', label: 'Label', type: 'text' },
          { name: 'value', label: 'Value', type: 'text' },
        ], description: 'Product spec table rows.' },
      { name: 'price', label: 'Price', type: 'text', required: true, description: 'Display price string like "18 900 €".' },
      { name: 'inStock', label: 'In stock', type: 'boolean', required: true, description: 'Mark this item as available in stock.' },
      { name: 'imageId', label: 'Image', type: 'select', relation: { collection: 'images', labelField: 'filename', valueField: '_id' }, description: 'Boutique product image.' },
      { name: 'tags', label: 'Tags', type: 'stringArray', description: 'Optional boutique item tags.' },
    ],
  },
  news: {
    collection: 'news',
    label: 'News articles',
    description: 'News posts and updates for the site.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique news article identifier.' },
      { name: 'title', label: 'Title', type: 'text', required: true, description: 'News title shown on the website.' },
      { name: 'date', label: 'Date', type: 'date', required: true, description: 'Display date for the news article.' },
      { name: 'publishedAt', label: 'Published at', type: 'date', required: true, description: 'Publication date for the news article.' },
      { name: 'categoryId', label: 'Category', type: 'select', required: true, relation: { collection: 'newsCategories', labelField: 'label', valueField: 'slug' }, description: 'Select the news category for this article.' },
      { name: 'subcategory', label: 'Subcategory', type: 'select', description: 'Select the news subcategory for the chosen category.' },
      { name: 'summary', label: 'Summary', type: 'textarea', required: true, description: 'Summary text shown on article listings.' },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea', description: 'Short summary for listings.' },
      { name: 'author', label: 'Author', type: 'text', description: 'Article author name.' },
      { name: 'tags', label: 'Tags', type: 'stringArray', description: 'Add article tags.' },
      { name: 'status', label: 'Status', type: 'select', options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
        ], description: 'Article publication status.' },
      { name: 'content', label: 'Content paragraphs', type: 'stringArray', required: true, description: 'Each paragraph of the news article.' },
      { name: 'imageId', label: 'Image', type: 'select', relation: { collection: 'images', labelField: 'filename', valueField: '_id' }, description: 'Image used for the article.' },
    ],
  },
  boutiqueCategories: {
    collection: 'boutiqueCategories',
    label: 'Boutique categories',
    description: 'Category metadata for boutique catalog items.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique boutique category identifier.' },
      { name: 'label', label: 'Label', type: 'text', required: true, description: 'Boutique category display name.' },
      { name: 'description', label: 'Description', type: 'textarea', required: true, description: 'Description of this boutique category.' },
      {
        name: 'subcategories',
        label: 'Subcategories',
        type: 'objectArray',
        itemLabel: 'Subcategory',
        itemFields: [
          { name: 'label', label: 'Label', type: 'text', required: true, description: 'Display name for the subcategory.' },
        ],
        description: 'Nested boutique subcategories grouped under this category. Slug is generated automatically from label.',
      },
    ],
  },
};

export function getCollectionSchema(collectionName: string, siteName = 'atlanticdunes'): AtlanticDunesCollectionSchema | undefined {
  const normalizedCollection = String(collectionName ?? '').trim();
  const normalizedSite = String(siteName ?? 'atlanticdunes').trim().toLowerCase();
  if (!normalizedCollection) return undefined;

  const collectionKey = Object.keys({
    ...collectionSchemas,
    ...adrobiofarmCollectionSchemas,
  }).find((key) => key.toLowerCase() === normalizedCollection.toLowerCase());
  if (!collectionKey) return undefined;

  if (normalizedSite === 'adrobiofarm') {
    return adrobiofarmCollectionSchemas[collectionKey] || collectionSchemas[collectionKey];
  }
  return collectionSchemas[collectionKey] || adrobiofarmCollectionSchemas[collectionKey];
}
