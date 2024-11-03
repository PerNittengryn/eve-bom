# The Eve Static Data Export (SDE) is heavy (about 0.5 gb), but we only need a fraction of it.
# Initially, we would like to extract all the information needed to build every ship in the game.
# We would like the webapp to be snappy, even on mobile.
# Thus, modules, rigs, structures, ammo, drones etc. are out of scope for now.
# We also assume that the most current version of the sde sqlite database is in `data/sde.sqlite`
# (Get this from https://www.fuzzwork.co.uk/dump/sqlite-latest.sqlite.bz2 )

# Imports (only built-in libraries, no external dependencies)
import sqlite3
import json

# Set variables
db_path = 'data/sde.sqlite'
type_ids_path = 'data/type_ids.json'
type_names_path = 'data/type_names.json'
bp_ids_path = 'data/bp_ids.json'

# First, we determine the type-ids of all ships
cmd = f"""
WITH RECURSIVE
  sub_group(mgID,mgName,level) AS (
    VALUES(4, 'Ship', 0)
    UNION ALL
    SELECT
      invMarketGroups.marketGroupID,
      invMarketGroups.marketGroupName,
      sub_group.level+1
    FROM invMarketGroups
    JOIN sub_group ON invMarketGroups.parentGroupID=sub_group.mgID
    ORDER BY 3 DESC
  )

  SELECT typeID, typeName
  FROM invTypes
  WHERE 
    marketGroupID IN (SELECT mgID FROM sub_group);
"""
with sqlite3.connect(db_path) as conn:
    cursor = conn.cursor()
    result = cursor.execute(cmd).fetchall()
    ships = {e[0]: {"name": e[1]} for e in result}
print(f"Found {len(ships)} ships")

# Then, for each ship type-id, we recursively get all necessary ingredients.
def get_bp_id(cursor, product_id):
    cmd = f"""
SELECT typeID
FROM industryActivityProducts
WHERE
  productTypeID = {product_id}
    """
    result = cursor.execute(cmd).fetchall()
    if len(result) == 0:
        return None
    return result[0][0]

def get_ingredients(cursor, bp_id):
    cmd = f"""
SELECT materialTypeID, quantity
FROM industryActivityMaterials
WHERE
  typeID = {bp_id}
  AND activityID IN (1, 11)  -- manufacture and reactions only, not invention
    """
    result = cursor.execute(cmd).fetchall()
    return {e[0]: e[1] for e in result}

def recursively_add_ingredients(cursor, type_id, known_ingredients=[]):
    bp_id = get_bp_id(cursor, type_id)
    if bp_id is None:
        return known_ingredients
    if bp_id not in known_ingredients:
        known_ingredients.append(bp_id)
    for ingredient_id in get_ingredients(cursor, bp_id):
        if ingredient_id not in known_ingredients:
            known_ingredients.append(ingredient_id)
            recursively_add_ingredients(cursor, ingredient_id, known_ingredients)
    return known_ingredients

def get_all_ingredients(db_path, ship_ids):
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        for ship_id in ship_ids:
            known_ingredients = recursively_add_ingredients(cursor, ship_id)
    return known_ingredients

ingredient_ids = get_all_ingredients(db_path, ships)
print(f'Identified {len(ingredient_ids)} relevant ingredients')

ship_ids = list(ships.keys())
relevant_ids = ship_ids + ingredient_ids
print(f'In total, we will extract {len(relevant_ids)} type-ids')

# We extract this data to three json files. First, type_ids.json
def get_type_name(cursor, type_id):
    cmd = f"""
SELECT typeName
FROM invTypes
WHERE typeID = {type_id}
    """
    result = cursor.execute(cmd).fetchall()
    if len(result) == 0:
        return None
    return result[0][0]

def get_all_names(db_path, type_ids):
    id2name = {}
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        for type_id in type_ids:
            id2name[type_id] = get_type_name(cursor, type_id)
    return id2name

def write_json(json_path, id2name):
    with open(json_path, 'w') as f:
        json.dump(id2name, f, indent=2)
        print(f'Wrote to: {json_path}')

id2name = get_all_names(db_path, relevant_ids)
write_json(type_ids_path, id2name)

# Then, type_names.json
name2id = {id2name[key]: key for key in id2name}
write_json(type_names_path, name2id)

# Finally, bp_ids.json:
def get_bp_output(cursor, bp_id):
    cmd = f"""
SELECT quantity
FROM industryActivityProducts
WHERE 
  typeID = {bp_id}
  AND activityID IN (1, 11)
    """
    result = cursor.execute(cmd).fetchall()
    if len(result) == 0:
        return None
    return result[0][0]

def get_bp_input(cursor, bp_id):
    cmd = f"""
SELECT quantity, materialTypeID
FROM industryActivityMaterials
WHERE 
  typeID = {bp_id}
  AND activityID IN (1, 11)
    """
    result = cursor.execute(cmd).fetchall()
    if result is None:
        return None
    return [[e[0], e[1]] for e in result]

def make_bp_dict(db_path, relevant_ids):
    bp_dict = {}
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        for type_id in relevant_ids:
            bp_id = get_bp_id(cursor, type_id)
            if bp_id is None:
                continue
            bp_dict[type_id] = {"o": get_bp_output(cursor, bp_id)}
            bp_dict[type_id]["i"] = get_bp_input(cursor, bp_id)
            bp_dict[type_id]["b"] = bp_id
    return bp_dict

bp_dict = make_bp_dict(db_path, relevant_ids)
write_json(bp_ids_path, bp_dict)
