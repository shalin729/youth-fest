export const DISTRICTS = ["Sabarkantha", "Aravalli", "Other"] as const;
export type District = (typeof DISTRICTS)[number];

export const VILLAGES: Record<string, string[]> = {
  Sabarkantha: [
    "Himatnagar", "Idar", "Prantij", "Talod", "Khedbrahma", "Vadali",
    "Bayad", "Meghraj", "Dhansura", "Malpur", "Shamlaji", "Kundlur",
    "Vijaynagar", "Pol", "Raipur", "Ambasan", "Katosan", "Ranasan",
    "Vasai", "Sabar", "Limkheda", "Bhiloda", "Modasa", "Anklav",
    "Tintoi", "Vasa", "Gabat", "Khimana", "Ruppur", "Dabhla",
    "Palol", "Chhatrala", "Kana", "Umra", "Mota Khakharia",
    "Nani Khakharia", "Juna Deesa", "Dantiwada", "Thara", "Vadnagar",
  ].sort(),

  Aravalli: [
    "Modasa", "Bayad", "Malpur", "Meghraj", "Dhansura", "Bhiloda",
    "Aravalli", "Anand", "Limkheda", "Ranasan", "Vadali", "Gambhoi",
    "Mansa", "Kadi", "Kathlal", "Dakor", "Devgadh Baria", "Lunawada",
    "Santrampur", "Khanpur", "Jhalod", "Fatepura", "Ghoghamba",
    "Godhra", "Halol", "Kalol", "Shehera", "Morwa Hadaf",
    "Virpur", "Kapadvanj", "Katpur", "Ode", "Khambhat", "Anklav",
    "Tarapur", "Umreth", "Petlad", "Sojitra", "Balasinor",
  ].sort(),

  Other: [],
};
