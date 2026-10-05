# Genera nutri-tabla.js a partir de USDA FoodData Central, SR Legacy (abril 2018, CC0).
# Cada alimento: palabras en español (raíces) -> descripción exacta de SR Legacy, y lo que pesa una unidad.
import csv, json, re, sys, io
# uso: python scripts/usda-tabla.py <carpeta de FoodData_Central_sr_legacy_food_csv_2018-04>
#   (el zip: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip)
D = sys.argv[1].rstrip('/\\') + '/'
OUT = __import__('os').path.join(__import__('os').path.dirname(__file__), '..', 'nutri-tabla.js')

# (clave = regex sobre el nombre normalizado, nombre, descripcion SR Legacy (regex ^...$), gramos por unidad o None)
A = [
  (r"platano|banana", "Plátano", r"Bananas, raw", 120),
  (r"manzana", "Manzana", r"Apples, raw, fuji, with skin.*", 180),
  (r"naranja", "Naranja", r"Oranges, raw, all commercial varieties", 180),
  (r"mandarina", "Mandarina", r"Tangerines, \(mandarin oranges\), raw", 80),
  (r"kiwi", "Kiwi", r"Kiwifruit, green, raw", 75),
  (r"fresa", "Fresas", r"Strawberries, raw", 12),
  (r"arandano", "Arándanos", r"Blueberries, raw", None),
  (r"pera\b", "Pera", r"Pears, raw", 170),
  (r"limon", "Limón", r"Lemons, raw, without peel", 60),
  (r"aguacate", "Aguacate", r"Avocados, raw, all commercial varieties", 150),
  (r"datil", "Dátiles", r"Dates, medjool", 24),
  (r"uva", "Uvas", r"Grapes, red or green \(European type, such as Thompson seedless\), raw", None),
  (r"mango", "Mango", r"Mangos, raw", 300),
  (r"pina\b|piña", "Piña", r"Pineapple, raw, all varieties", None),
  (r"melocoton", "Melocotón", r"Peaches, yellow, raw", 150),
  (r"tomate (triturado|frito)|tomate en conserva", "Tomate triturado", r"Tomatoes, crushed, canned", None),
  (r"tomate", "Tomate", r"Tomatoes, red, ripe, raw, year round average", 120),
  (r"cebolla", "Cebolla", r"Onions, raw", 150),
  (r"\bajo", "Ajo", r"Garlic, raw", 4),
  (r"pimiento", "Pimiento", r"Peppers, sweet, red, raw", 160),
  (r"zanahoria", "Zanahoria", r"Carrots, raw", 70),
  (r"espinaca", "Espinacas", r"Spinach, raw", None),
  (r"lechuga|canonigo|rucula", "Lechuga", r"Lettuce, cos or romaine, raw", 300),
  (r"brocoli", "Brócoli", r"Broccoli, raw", None),
  (r"coliflor", "Coliflor", r"Cauliflower, raw", None),
  (r"calabacin", "Calabacín", r"Squash, summer, zucchini, includes skin, raw", 250),
  (r"calabaza", "Calabaza", r"Pumpkin, raw", None),
  (r"berenjena", "Berenjena", r"Eggplant, raw", 300),
  (r"pepino", "Pepino", r"Cucumber, with peel, raw", 300),
  (r"judia verde|judias verdes", "Judías verdes", r"Beans, snap, green, raw", None),
  (r"boniato", "Boniato", r"Sweet potato, raw, unprepared.*", 250),
  (r"patata", "Patata", r"Potatoes, flesh and skin, raw", 170),
  (r"champinon|seta", "Champiñones", r"Mushrooms, white, raw", 18),
  (r"guisante", "Guisantes", r"Peas, green, raw", None),
  (r"garbanzo", "Garbanzos cocidos", r"Chickpeas \(garbanzo beans, bengal gram\), mature seeds, canned, drained, rinsed in tap water", None),
  (r"lentejas? (cocidas?|de bote|en conserva)|bote de lentejas", "Lentejas cocidas", r"Lentils, mature seeds, cooked, boiled, without salt", None),
  (r"lenteja", "Lentejas (secas)", r"Lentils, raw", None),
  (r"pistacho", "Pistachos", r"Nuts, pistachio nuts, raw", None),
  (r"arroz.*microondas|arroz cocido|arroz vasito", "Arroz cocido", r"Rice, white, long-grain, regular, enriched, cooked", 125),
  (r"arroz", "Arroz (crudo)", r"Rice, white, long-grain, regular, raw, unenriched", None),
  (r"pasta|macarron|rigatoni|espagueti|fideo|penne|tallarin", "Pasta (seca)", r"Pasta, dry, unenriched", None),
  (r"quinoa", "Quinoa (cruda)", r"Quinoa, uncooked", None),
  (r"avena|copos", "Avena", r"Cereals, oats, regular and quick, not fortified, dry", None),
  (r"pan rallado", "Pan rallado", r"Bread, crumbs, dry, grated, plain", None),
  (r"pan integral|pan de centeno", "Pan integral", r"Bread, whole-wheat, commercially prepared", 30),
  (r"\bpan\b|tostada|pan de molde|baguette", "Pan blanco", r"Bread, white, commercially prepared \(includes soft bread crumbs\)", 30),
  (r"pechuga|solomillo de pollo|solomillos de pollo|pollo", "Pechuga de pollo", r"Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw", 200),
  (r"contramuslo|muslo", "Contramuslo de pollo", r"Chicken, broilers or fryers, dark meat, thigh, meat only, raw", 100),
  (r"pavo", "Pavo (fiambre)", r"Turkey breast, sliced, prepackaged", 15),
  (r"carne picada|picada|hamburguesa|ternera", "Carne picada", r"Beef, ground, 85% lean meat / 15% fat, raw.*", None),
  (r"lomo|cerdo", "Lomo de cerdo", r"Pork, fresh, loin, whole, separable lean only, raw", None),
  (r"salmon", "Salmón", r"Fish, salmon, Atlantic, farmed, raw", 125),
  (r"merluza|bacalao|pescado blanco", "Pescado blanco", r"Fish, cod, Atlantic, raw", 125),
  (r"atun", "Atún en lata (al natural)", r"Fish, tuna, light, canned in water, drained solids.*", 56),
  (r"gamba|langostino", "Gambas", r"Crustaceans, shrimp, raw", None),
  (r"mejillon", "Mejillones", r"Mollusks, mussel, blue, raw", None),
  (r"huevo", "Huevo", r"Egg, whole, raw, fresh", 55),
  (r"leche", "Leche semidesnatada", r"Milk, lowfat, fluid, 1% milkfat, with added vitamin A and vitamin D", None),
  (r"yogur griego", "Yogur griego", r"Yogurt, Greek, plain, whole milk", 125),
  (r"yogur|kefir", "Yogur natural", r"Yogurt, plain, whole milk", 125),
  (r"queso fresco batido|requeson|cottage", "Queso fresco", r"Cheese, cottage, lowfat, 1% milkfat", None),
  (r"mozzarella", "Mozzarella", r"Cheese, mozzarella, whole milk", 125),
  (r"queso", "Queso curado", r"Cheese, cheddar \(Includes.*", None),
  (r"nata", "Nata", r"Cream, fluid, heavy whipping", None),
  (r"proteina|whey", "Proteína en polvo (suero)", r"Beverages, Whey protein powder isolate", None),   # antes que cacahuete: "proteína de cacahuete" es proteína
  (r"mantequilla de cacahuete|crema de cacahuete", "Crema de cacahuete", r"Peanut butter, smooth style, without salt", None),
  (r"mantequilla", "Mantequilla", r"Butter, without salt", None),
  (r"aceite|aove", "Aceite de oliva", r"Oil, olive, salad or cooking", None),
  (r"nuez|nueces", "Nueces", r"Nuts, walnuts, english", None),
  (r"almendra", "Almendras", r"Nuts, almonds", None),
  (r"cacahuete", "Cacahuetes", r"Peanuts, all types, raw", None),
  (r"miel", "Miel", r"Honey", None),
  (r"chocolate", "Chocolate negro", r"Chocolate, dark, 70-85% cacao solids", None),
  (r"cacao", "Cacao en polvo", r"Cocoa, dry powder, unsweetened", None),
  (r"tahini|tahin", "Tahini", r"Seeds, sesame butter, tahini, from roasted and toasted kernels \(most common type\)", None),
  (r"hummus", "Hummus", r"Hummus, commercial", None),
  (r"tofu", "Tofu", r"Tofu, firm, prepared with calcium sulfate and magnesium chloride \(nigari\)", None),
]
N = {"kcal": 1008, "prot": 1003, "hc": 1005, "grasa": 1004, "fibra": 1079, "vitC": 1162, "folato": 1190, "hierro": 1089,
     "magnesio": 1090, "potasio": 1092, "b12": 1178, "vitD": 1114, "sodio": 1093, "calcio": 1087, "azucar": 2000}
foods = {}
with open(D + "food.csv", encoding="utf8") as f:
    for r in csv.DictReader(f): foods[r["fdc_id"]] = r["description"]
ids = {}
for k, nom, desc, ud in A:
    m = [i for i, d in foods.items() if re.fullmatch(desc, d)]
    if not m: print("FALTA", nom, "->", desc, [d for d in foods.values() if d.lower().startswith(desc.split(",")[0].lower().replace("\\", ""))][:6]); continue
    ids[m[0]] = (k, nom, ud)
want = set(N.values()); val = {i: {} for i in ids}
with open(D + "food_nutrient.csv", encoding="utf8") as f:
    for r in csv.DictReader(f):
        if r["fdc_id"] in val and int(r["nutrient_id"]) in want: val[r["fdc_id"]][int(r["nutrient_id"])] = float(r["amount"])
fol_total = {}
with open(D + "food_nutrient.csv", encoding="utf8") as f:
    for r in csv.DictReader(f):
        if r["fdc_id"] in val and int(r["nutrient_id"]) == 1177: fol_total[r["fdc_id"]] = float(r["amount"])
filas = []
for i, (k, nom, ud) in ids.items():
    v = val[i]; x = {}
    for n, nid in N.items():
        a = v.get(nid)
        if n == "folato" and a is None: a = fol_total.get(i)
        if a is not None: x[n] = round(a, 2) if a < 10 else round(a, 1)
    filas.append({"k": k, "nombre": nom, "fdc": int(i), "ud": ud, "n": x})
order = {k: j for j, (k, _, _, _) in enumerate(A)}
filas.sort(key=lambda f: order[f["k"]])
js = ("/* NUTRI-TABLA · generado por scripts/usda-tabla.py desde USDA FoodData Central, SR Legacy (abril 2018).\n"
      "   Dominio público (CC0): https://fdc.nal.usda.gov · Por 100 g de la parte que se come. ud = gramos de una unidad\n"
      "   (estimación propia, no de USDA). k = palabras del nombre en español. No editar a mano: se rehace con el script. */\n"
      "(function (raiz) { var T = " + json.dumps(filas, ensure_ascii=False, separators=(",", ":")) + ";\n"
      "  if (typeof module === \"object\" && module.exports) module.exports = T; else raiz.NutriTabla = T;\n"
      "})(typeof window !== \"undefined\" ? window : this);\n")
open(OUT, "w", encoding="utf8").write(js)
print(len(filas), "alimentos", len(js), "bytes")
