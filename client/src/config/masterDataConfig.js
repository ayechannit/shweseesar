export const masterDataConfig = {
  patients: {
    title: 'Patients',
    table: 'patients',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'patient_code', label: 'Patient Code', type: 'text', required: true, readonly: true },
      { name: 'phone_number', label: 'Phone Number', type: 'text', required: true },
      { name: 'age', label: 'Age', type: 'number', required: false, transient: true, hideInTable: true },
      { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
      { name: 'address', label: 'Address', type: 'text', required: true },
    ]
  },
  physicians: {
    title: 'Physicians',
    table: 'physicians',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'specialty', label: 'Specialty', type: 'text', required: true },
      { name: 'phone_number', label: 'Phone Number', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ]
  },
  medical_officers: {
    title: 'Medical Officers',
    table: 'medical_officers',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'qualification', label: 'Qualification', type: 'text', required: true },
      { name: 'phone_number', label: 'Phone Number', type: 'text', required: true },
    ]
  },
  nurses: {
    title: 'Nurses',
    table: 'nurses',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'department', label: 'Department', type: 'text', required: true },
      { name: 'phone_number', label: 'Phone Number', type: 'text', required: true },
    ]
  },
  suppliers: {
    title: 'Suppliers',
    table: 'suppliers',
    fields: [
      { name: 'company_name', label: 'Company Name', type: 'text', required: true },
      { name: 'contact_person', label: 'Contact Person', type: 'text', required: true },
      { name: 'phone_number', label: 'Phone Number', type: 'text', required: true },
      { name: 'address', label: 'Address', type: 'text', required: true },
    ]
  },
  referred_persons: {
    title: 'Referred Persons',
    table: 'referred_persons',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'organization', label: 'Organization', type: 'text', required: true },
      { name: 'phone_number', label: 'Phone Number', type: 'text', required: true },
      { name: 'referral_percentage', label: 'Referral Percentage (%)', type: 'number', required: true },
    ]
  },
  item_categories: {
    title: 'Item Categories',
    table: 'item_categories',
    fields: [
      { name: 'name', label: 'Category Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text', required: false },
    ]
  },
  item_subcategories: {
    title: 'Item Subcategories',
    table: 'item_subcategories',
    fields: [
      { name: 'category_id', label: 'Category ID', type: 'number', required: true }, // Ideally this would be a dropdown of categories, keeping it simple for now
      { name: 'name', label: 'Subcategory Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text', required: false },
    ]
  },
  laboratories: {
    title: 'Laboratories',
    table: 'laboratories',
    fields: [
      { name: 'name', label: 'Laboratory Name', type: 'text', required: true },
      { name: 'commission_percentage', label: 'Default Commission (%)', type: 'number', required: false },
      { name: 'contact_person', label: 'Contact Person', type: 'text', required: false },
      { name: 'phone_number', label: 'Phone Number', type: 'text', required: false },
      { name: 'address', label: 'Address', type: 'text', required: false },
    ]
  },
  refer_clinics: {
    title: 'Refer Clinics',
    table: 'refer_clinics',
    fields: [
      { name: 'name', label: 'Clinic Name', type: 'text', required: true },
      { name: 'opd_commission', label: 'OPD Commission', type: 'number', required: true },
      { name: 'ot_commission', label: 'OT Commission', type: 'number', required: true },
      { name: 'admission_commission', label: 'Admission Commission', type: 'number', required: true },
      { name: 'ultrasound_commission', label: 'Ultrasound Commission', type: 'number', required: true },
      { name: 'xray_commission', label: 'X-Ray Commission', type: 'number', required: true },
    ]
  }
};