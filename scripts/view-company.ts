/**
 * Quick script to view company data from the database
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("📊 Fetching company data...\n");

  const companies = await prisma.company.findMany({
    include: {
      users: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
      products: {
        select: {
          sku: true,
          name: true,
          category: true,
          unitPrice: true,
        },
      },
      customers: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      vendors: {
        select: {
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          users: true,
          products: true,
          batches: true,
          sales: true,
          customers: true,
          vendors: true,
          accounts: true,
          transactions: true,
        },
      },
    },
  });

  if (companies.length === 0) {
    console.log("❌ No companies found in the database.");
    console.log("   Run: npm run prisma:seed to create sample data.");
    return;
  }

  for (const company of companies) {
    console.log("=".repeat(60));
    console.log(`🏢 Company: ${company.name}`);
    console.log("=".repeat(60));
    console.log(`   ID: ${company.id}`);
    console.log(`   Address: ${company.address || "N/A"}`);
    console.log(`   Phone: ${company.phone || "N/A"}`);
    console.log(`   Email: ${company.email || "N/A"}`);
    console.log(`   Created: ${company.createdAt.toLocaleDateString()}`);
    console.log("");

    console.log("📈 Statistics:");
    console.log(`   Users: ${company._count.users}`);
    console.log(`   Products: ${company._count.products}`);
    console.log(`   Batches: ${company._count.batches}`);
    console.log(`   Sales: ${company._count.sales}`);
    console.log(`   Customers: ${company._count.customers}`);
    console.log(`   Vendors: ${company._count.vendors}`);
    console.log(`   Accounts: ${company._count.accounts}`);
    console.log(`   Transactions: ${company._count.transactions}`);
    console.log("");

    if (company.users.length > 0) {
      console.log("👥 Users:");
      company.users.forEach((user) => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
      });
      console.log("");
    }

    if (company.products.length > 0) {
      console.log("📦 Products (first 5):");
      company.products.slice(0, 5).forEach((product) => {
        console.log(
          `   - ${product.sku}: ${product.name} (${product.category}) - $${product.unitPrice}`
        );
      });
      if (company.products.length > 5) {
        console.log(`   ... and ${company.products.length - 5} more`);
      }
      console.log("");
    }

    if (company.customers.length > 0) {
      console.log("👤 Customers:");
      company.customers.forEach((customer) => {
        console.log(`   - ${customer.name} (${customer.email || customer.phone || "N/A"})`);
      });
      console.log("");
    }

    if (company.vendors.length > 0) {
      console.log("🏭 Vendors:");
      company.vendors.forEach((vendor) => {
        console.log(`   - ${vendor.name} (${vendor.email || "N/A"})`);
      });
      console.log("");
    }
  }

  console.log("=".repeat(60));
  console.log("✅ Done! Use 'npm run prisma:studio' to view full data in browser.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

