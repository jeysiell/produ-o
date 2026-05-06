function hasOwn(objectValue, key) {
  return Object.prototype.hasOwnProperty.call(objectValue || {}, key);
}

function createPermissionHelpers({ permissionKeys, rolePermissionDefaults }) {
  function buildEmptyPermissions() {
    return {
      menus: Object.fromEntries(permissionKeys.menus.map((key) => [key, false])),
      features: Object.fromEntries(permissionKeys.features.map((key) => [key, false])),
    };
  }

  function normalizePermissionsPayload(rawPermissions, options = {}) {
    const includeAllKeys = options.includeAllKeys === true;
    const normalized = includeAllKeys ? buildEmptyPermissions() : { menus: {}, features: {} };
    if (!rawPermissions || typeof rawPermissions !== "object") return normalized;

    const rawMenus =
      rawPermissions.menus && typeof rawPermissions.menus === "object" ? rawPermissions.menus : {};
    const rawFeatures =
      rawPermissions.features && typeof rawPermissions.features === "object"
        ? rawPermissions.features
        : {};

    permissionKeys.menus.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(rawMenus, key)) {
        normalized.menus[key] = Boolean(rawMenus[key]);
      }
    });

    permissionKeys.features.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(rawFeatures, key)) {
        normalized.features[key] = Boolean(rawFeatures[key]);
      }
    });

    return normalized;
  }

  function getRoleDefaultPermissions(role) {
    const defaults = rolePermissionDefaults[role] || buildEmptyPermissions();
    return { menus: { ...defaults.menus }, features: { ...defaults.features } };
  }

  function getEffectivePermissions(role, customPermissions) {
    const defaults = getRoleDefaultPermissions(role);
    const normalizedCustom = normalizePermissionsPayload(customPermissions);
    const effective = buildEmptyPermissions();

    permissionKeys.menus.forEach((key) => {
      if (hasOwn(normalizedCustom.menus, key)) {
        effective.menus[key] = Boolean(normalizedCustom.menus[key]);
        return;
      }
      effective.menus[key] = Boolean(defaults.menus[key]);
    });

    permissionKeys.features.forEach((key) => {
      if (hasOwn(normalizedCustom.features, key)) {
        effective.features[key] = Boolean(normalizedCustom.features[key]);
        return;
      }
      effective.features[key] = Boolean(defaults.features[key]);
    });

    return effective;
  }

  function hasEffectivePermission(user, permissionPath) {
    const [section, key] = String(permissionPath || "").split(".");
    if (!section || !key) return false;

    const effective = getEffectivePermissions(user?.role, user?.permissions);
    if (section === "menus") return Boolean(effective.menus[key]);
    if (section === "features") return Boolean(effective.features[key]);
    return false;
  }

  return {
    hasOwn,
    buildEmptyPermissions,
    normalizePermissionsPayload,
    getRoleDefaultPermissions,
    getEffectivePermissions,
    hasEffectivePermission,
  };
}

module.exports = { createPermissionHelpers, hasOwn };
