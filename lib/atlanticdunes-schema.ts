export type RelationField = {
  collection: 'poles' | 'domains' | 'newsCategories' | 'images';
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
  itemFields?: Array<{ name: string; label: string; type: 'text' | 'number' | 'textarea' }>;
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
    description: 'Business poles used to classify services and products.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true, description: 'Unique identifier used in URLs.' },
      { name: 'label', label: 'Label', type: 'text', required: true, description: 'Display name shown on the website.' },
      { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true, description: 'A brief description for navigation cards.' },
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
    idField: 'id',
    fields: [
      { name: 'id', label: 'Category ID', type: 'text', required: true, description: 'Unique category identifier.' },
      { name: 'label', label: 'Label', type: 'text', required: true, description: 'Category display name.' },
      { name: 'description', label: 'Description', type: 'textarea', required: true, description: 'What this news category is for.' },
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
      { name: 'status', label: 'Status', type: 'select', options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
        ], description: 'Publish state for the service.', },
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
      { name: 'pdfLink', label: 'PDF link', type: 'text', description: 'URL to a PDF brochure or datasheet.' },
      { name: 'unitPrice', label: 'Unit price', type: 'number', description: 'Optional numeric price.' },
      { name: 'currency', label: 'Currency', type: 'text', description: 'Optional currency code like EUR.' },
      { name: 'imageId', label: 'Image', type: 'select', relation: { collection: 'images', labelField: 'filename', valueField: '_id' }, description: 'Select the main product image.' },
    ],
  },
  boutique: {
    collection: 'boutique',
    label: 'Boutique items',
    description: 'Simple product items for the boutique store.',
    idField: 'slug',
    fields: [
      { name: 'slug', label: 'Slug', type: 'slug', required: true },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'details', label: 'Details', type: 'stringArray', description: 'Key product features and details.' },
      { name: 'specs', label: 'Specification rows', type: 'objectArray', itemLabel: 'Spec', itemFields: [
          { name: 'label', label: 'Label', type: 'text' },
          { name: 'value', label: 'Value', type: 'text' },
        ], description: 'Product spec table rows.' },
      { name: 'price', label: 'Price', type: 'text', required: true, description: 'Display price string like "18 900 €".' },
      { name: 'availability', label: 'Availability', type: 'select', required: true, options: [
          { label: 'En stock limité', value: 'En stock limité' },
          { label: 'AvailabilityRequired', value: 'AvailabilityRequired' },
        ], description: 'Choose the product availability status.' },
      { name: 'inStock', label: 'In stock', type: 'boolean', required: true },
      { name: 'poleId', label: 'Pole', type: 'select', required: true, relation: { collection: 'poles', labelField: 'label', valueField: 'slug' } },
      { name: 'domainId', label: 'Domain', type: 'select', required: true, relation: { collection: 'domains', labelField: 'label', valueField: 'slug' } },
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
      { name: 'date', label: 'Display date', type: 'date', required: true, description: 'The date shown on the article.' },
      { name: 'publishedAt', label: 'Published at', type: 'date', required: true, description: 'Publication date for the article.' },
      { name: 'categoryId', label: 'Category', type: 'select', required: true, relation: { collection: 'newsCategories', labelField: 'label', valueField: 'id' } },
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

export function getCollectionSchema(collectionName: string): AtlanticDunesCollectionSchema | undefined {
  return collectionSchemas[collectionName];
}
