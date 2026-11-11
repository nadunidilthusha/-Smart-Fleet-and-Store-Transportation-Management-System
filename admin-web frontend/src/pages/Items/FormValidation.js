// Shared validation helpers for the Add Cargo Item form

// Check whether a string value is present after trimming whitespace
export const isRequired = (value) => String(value ?? "").trim().length > 0;

// Validate a non-negative number for weight, volume, stock, and reorder fields
export const isNonNegativeNumber = (value) => {
  if (!isRequired(value)) return false;
  const normalized = String(value).replace(/,/g, "").trim();
  return /^\d+(\.\d+)?$/.test(normalized) && Number(normalized) >= 0;
};

// Build a field-error map for draft or full item submission
export const validateItemForm = (formData, { asDraft = false } = {}) => {
  const errors = {};

  // Draft saves still require the item identity fields
  if (!isRequired(formData.itemCode)) {
    errors.itemCode = "Item code / SKU is required.";
  }
  if (!isRequired(formData.itemName)) {
    errors.itemName = "Item name is required.";
  }

  // Full submit enforces the complete catalog registration checklist
  if (!asDraft) {
    if (!isRequired(formData.category)) {
      errors.category = "Select a catalog category.";
    }
    if (!isRequired(formData.storageHub)) {
      errors.storageHub = "Select a primary storage hub.";
    }
    if (!isNonNegativeNumber(formData.weightKg)) {
      errors.weightKg = "Enter a valid unit weight in kg.";
    }
    if (!isNonNegativeNumber(formData.volumeM3)) {
      errors.volumeM3 = "Enter a valid unit volume in m³.";
    }
    if (!isNonNegativeNumber(formData.stockOnHand)) {
      errors.stockOnHand = "Enter a valid initial stock quantity.";
    }
    if (!isNonNegativeNumber(formData.reorderLevel)) {
      errors.reorderLevel = "Enter a valid reorder level.";
    }
    if (!isRequired(formData.operationalStatus)) {
      errors.operationalStatus = "Select an initial operational status.";
    }
  }

  return errors;
};

// Convenience helper that reports whether the form currently has any errors
export const isItemFormValid = (formData, options) =>
  Object.keys(validateItemForm(formData, options)).length === 0;
