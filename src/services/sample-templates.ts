/**
 * Sample company templates by category
 * Used for multi-company sample data - creates new companies without overwriting existing
 */

import type { SampleCategory } from "../shared/sample-categories";

export type { SampleCategory };
export const SAMPLE_CATEGORIES: Record<
  SampleCategory,
  {
    company: { name: string; address: string; phone: string; email: string };
    products: Array<{ sku: string; name: string; description: string; category: string }>;
    areas: Array<{ code: string; name: string }>;
    customers: Array<{ name: string; email: string; phone: string; address: string; areaCode: string }>;
    vendors: Array<{ name: string; email: string; phone: string; address: string }>;
  }
> = {
  grocery: {
    company: {
      name: "Prime Grocery Agency",
      address: "Plot 15, Block 7, Gulberg III, Lahore, Punjab 54000",
      phone: "+92-42-35761234",
      email: "info@primegrocery.pk",
    },
    products: [
      { sku: "GRC-001", name: "Sella Basmati Rice", description: "Super Kernel Basmati Rice, 5kg bag", category: "Staples" },
      { sku: "GRC-002", name: "Chana Dal", description: "Split chickpeas, 1kg", category: "Pulses & Lentils" },
      { sku: "GRC-003", name: "Moong Dal", description: "Split mung beans, 1kg", category: "Pulses & Lentils" },
      { sku: "GRC-004", name: "Cooking Oil", description: "Dalda Banaspati Ghee, 1kg", category: "Cooking Oil" },
      { sku: "GRC-005", name: "Rooh Afza", description: "Sharbat concentrate, 800ml", category: "Beverages" },
      { sku: "GRC-006", name: "Pakola Ice Cola", description: "Pakola soft drink, 250ml", category: "Beverages" },
      { sku: "GRC-007", name: "Tapal Danedar Tea", description: "Tea leaves, 400g", category: "Beverages" },
      { sku: "GRC-008", name: "Sugar", description: "White refined sugar, 2kg", category: "Staples" },
      { sku: "GRC-009", name: "Chakki Atta", description: "Stone-ground wheat flour, 10kg", category: "Staples" },
      { sku: "GRC-010", name: "Red Chilli Powder", description: "Lal mirch powder, 200g", category: "Spices" },
    ],
    areas: [
      { code: "LHR-01", name: "Gulberg III" },
      { code: "LHR-02", name: "DHA Phase 5" },
      { code: "LHR-03", name: "Model Town" },
      { code: "LHR-04", name: "Saddar" },
    ],
    customers: [
      { name: "Muhammad Imran", email: "imran.khan@email.com", phone: "+92-300-1234567", address: "45 F Block, Main Blvd, Gulberg III", areaCode: "LHR-01" },
      { name: "Ayesha Malik", email: "ayesha.malik@email.com", phone: "+92-321-9876543", address: "House 12, Street 5, DHA Phase 5", areaCode: "LHR-02" },
      { name: "Abdul Rahman", email: "abdul.rahman@email.com", phone: "+92-333-5551234", address: "Block C, Model Town", areaCode: "LHR-03" },
      { name: "Sana Khan", email: "sana.khan@email.com", phone: "+92-42-35876543", address: "Shop 8, Anarkali Bazaar, Saddar", areaCode: "LHR-04" },
    ],
    vendors: [
      { name: "Karachi Wholesale Traders", email: "orders@karachiwholesale.pk", phone: "+92-21-35678901", address: "Sabzi Mandi, Karachi" },
      { name: "Punjab Grocery Distributors", email: "supply@punjabgrocery.pk", phone: "+92-42-35123456", address: "Akbari Mandi, Lahore" },
    ],
  },
  pharmacy: {
    company: {
      name: "MedPlus Pharmacy",
      address: "Shop 22, Block 9, DHA Phase 6, Karachi 75500",
      phone: "+92-21-35891234",
      email: "info@medpluspharmacy.pk",
    },
    products: [
      { sku: "PHM-001", name: "Panadol Extra", description: "Paracetamol 500mg, 20 tablets", category: "Pain Relief" },
      { sku: "PHM-002", name: "Disprin", description: "Aspirin 300mg, 10 tablets", category: "Pain Relief" },
      { sku: "PHM-003", name: "Brufen 400", description: "Ibuprofen 400mg, 20 tablets", category: "Pain Relief" },
      { sku: "PHM-004", name: "Surbex Z", description: "Multivitamin with zinc, 30 capsules", category: "Vitamins" },
      { sku: "PHM-005", name: "Calcium Sandoz", description: "Calcium supplement, 10 effervescent tablets", category: "Vitamins" },
      { sku: "PHM-006", name: "Flagyl 400", description: "Metronidazole 400mg, 10 tablets", category: "Antibiotics" },
      { sku: "PHM-007", name: "Augmentin 625", description: "Amoxicillin + Clavulanic acid, 6 tablets", category: "Antibiotics" },
      { sku: "PHM-008", name: "Omeprazole 20mg", description: "Gastric acid reducer, 14 capsules", category: "Digestive" },
      { sku: "PHM-009", name: "Strepsils", description: "Sore throat lozenges, 24 pack", category: "Cough & Cold" },
      { sku: "PHM-010", name: "Vicks VapoRub", description: "Topical decongestant, 50g", category: "Cough & Cold" },
    ],
    areas: [
      { code: "KHI-01", name: "DHA Phase 6" },
      { code: "KHI-02", name: "Clifton" },
      { code: "KHI-03", name: "Gulshan-e-Iqbal" },
      { code: "KHI-04", name: "Korangi" },
    ],
    customers: [
      { name: "Dr. Farhan Ahmed", email: "farhan.ahmed@email.com", phone: "+92-300-1112233", address: "Clinic 5, DHA Phase 6", areaCode: "KHI-01" },
      { name: "Nadia Hussain", email: "nadia.h@email.com", phone: "+92-321-4445566", address: "Block 12, Clifton", areaCode: "KHI-02" },
      { name: "Kamran Ali", email: "kamran.ali@email.com", phone: "+92-333-7778899", address: "Gulshan Block 5", areaCode: "KHI-03" },
      { name: "Zainab Fatima", email: "zainab.f@email.com", phone: "+92-21-35551234", address: "Korangi Industrial", areaCode: "KHI-04" },
    ],
    vendors: [
      { name: "Getz Pharma", email: "orders@getzpharma.com", phone: "+92-21-11123456", address: "SITE Area, Karachi" },
      { name: "Ferozsons Labs", email: "supply@ferozsons.com.pk", phone: "+92-42-35876543", address: "Kot Lakhpat, Lahore" },
    ],
  },
  electronics: {
    company: {
      name: "TechHub Electronics",
      address: "Mall of Lahore, 2nd Floor, Gulberg III, Lahore 54000",
      phone: "+92-42-35770000",
      email: "sales@techhubelectronics.pk",
    },
    products: [
      { sku: "ELEC-001", name: "Samsung Galaxy A54", description: "128GB, 8GB RAM, Dual SIM", category: "Smartphones" },
      { sku: "ELEC-002", name: "iPhone 14", description: "128GB Storage", category: "Smartphones" },
      { sku: "ELEC-003", name: "Dell Inspiron 15", description: "i5, 8GB RAM, 256GB SSD", category: "Laptops" },
      { sku: "ELEC-004", name: "HP Pavilion", description: "Ryzen 5, 16GB RAM, 512GB SSD", category: "Laptops" },
      { sku: "ELEC-005", name: "Logitech M185", description: "Wireless mouse", category: "Accessories" },
      { sku: "ELEC-006", name: "Samsung 32\" LED", description: "Full HD Smart TV", category: "TVs" },
      { sku: "ELEC-007", name: "JBL Tune 500BT", description: "Wireless headphones", category: "Audio" },
      { sku: "ELEC-008", name: "Power Bank 20000mAh", description: "Fast charging, dual USB", category: "Accessories" },
      { sku: "ELEC-009", name: "USB-C Hub", description: "7-in-1 adapter", category: "Accessories" },
      { sku: "ELEC-010", name: "Keyboard + Mouse Combo", description: "Wireless desktop set", category: "Accessories" },
    ],
    areas: [
      { code: "LHR-E1", name: "Gulberg III" },
      { code: "LHR-E2", name: "Liberty Market" },
      { code: "LHR-E3", name: "Packages Mall" },
      { code: "LHR-E4", name: "Emporium Mall" },
    ],
    customers: [
      { name: "Ali Raza", email: "ali.raza@email.com", phone: "+92-300-9998877", address: "DHA Phase 4", areaCode: "LHR-E1" },
      { name: "Sara Ahmed", email: "sara.ahmed@email.com", phone: "+92-321-6665544", address: "Liberty", areaCode: "LHR-E2" },
      { name: "Usman Khan", email: "usman.k@email.com", phone: "+92-333-2223344", address: "Johar Town", areaCode: "LHR-E3" },
      { name: "Fatima Noor", email: "fatima.n@email.com", phone: "+92-42-35778899", address: "Model Town", areaCode: "LHR-E4" },
    ],
    vendors: [
      { name: "Tech Solutions Pakistan", email: "orders@techsolutions.pk", phone: "+92-42-35880000", address: "Hall Road, Lahore" },
      { name: "Gray Tech Imports", email: "imports@graytech.pk", phone: "+92-21-35221111", address: "Karachi" },
    ],
  },
  retail: {
    company: {
      name: "City Mart",
      address: "Main Boulevard, F-7 Markaz, Islamabad 44000",
      phone: "+92-51-2823456",
      email: "info@citymart.com.pk",
    },
    products: [
      { sku: "RET-001", name: "School Bag", description: "Waterproof backpack, 15\" laptop", category: "Stationery" },
      { sku: "RET-002", name: "Notebook Set", description: "5 ruled notebooks, 120 pages", category: "Stationery" },
      { sku: "RET-003", name: "Kitchen Towel Roll", description: "6-pack paper towels", category: "Home" },
      { sku: "RET-004", name: "Dish Soap", description: "500ml lemon", category: "Home" },
      { sku: "RET-005", name: "Toothpaste", description: "150g fluoride", category: "Personal Care" },
      { sku: "RET-006", name: "Shampoo 400ml", description: "Anti-dandruff", category: "Personal Care" },
      { sku: "RET-007", name: "LED Bulb 9W", description: "Warm white, E27", category: "Electrical" },
      { sku: "RET-008", name: "Extension Cord", description: "4 sockets, 3m", category: "Electrical" },
      { sku: "RET-009", name: "Plastic Storage Box", description: "50L with lid", category: "Home" },
      { sku: "RET-010", name: "Umbrella", description: "Auto open, wind resistant", category: "General" },
    ],
    areas: [
      { code: "ISB-01", name: "F-7 Markaz" },
      { code: "ISB-02", name: "F-10" },
      { code: "ISB-03", name: "Blue Area" },
      { code: "ISB-04", name: "G-9" },
    ],
    customers: [
      { name: "Ahmed Hassan", email: "ahmed.h@email.com", phone: "+92-300-1234567", address: "F-7/2", areaCode: "ISB-01" },
      { name: "Maria Khan", email: "maria.k@email.com", phone: "+92-321-7654321", address: "F-10/3", areaCode: "ISB-02" },
      { name: "Omar Sheikh", email: "omar.s@email.com", phone: "+92-333-9876543", address: "Blue Area", areaCode: "ISB-03" },
      { name: "Layla Ahmed", email: "layla.a@email.com", phone: "+92-51-2821111", address: "G-9/1", areaCode: "ISB-04" },
    ],
    vendors: [
      { name: "Islamabad Wholesale", email: "orders@isbwholesale.pk", phone: "+92-51-28220000", address: "I-9 Industrial" },
      { name: "National Distributors", email: "supply@nationaldist.pk", phone: "+92-42-35111111", address: "Lahore" },
    ],
  },
};
