import fs from 'fs';

export type FamilyNames = Record<string, string>;

/** Parses and validates the family code -> display name map. */
export function parseFamilyNames(json: string): FamilyNames {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Family names file is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Family names file must be a JSON object of code -> name');
  }

  const names: FamilyNames = {};
  const seen = new Map<string, string>();
  for (const [code, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Family "${code}" must have a non-empty string name`);
    }
    const key = value.trim().toLowerCase();
    const previous = seen.get(key);
    if (previous !== undefined) {
      throw new Error(`Duplicate family name "${value}" for codes "${previous}" and "${code}"`);
    }
    seen.set(key, code);
    names[code] = value.trim();
  }
  return names;
}

export function loadFamilyNames(filePath: string): FamilyNames {
  return parseFamilyNames(fs.readFileSync(filePath, 'utf8'));
}
