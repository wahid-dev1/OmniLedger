import { HashRouter, Routes, Route } from "react-router-dom";
import { CompanyConfiguration } from "@/components/CompanyConfiguration";
import { DatabaseConfiguration } from "@/components/DatabaseConfiguration";
import { SplashScreen } from "@/components/SplashScreen";
import { LandingPage } from "@/components/LandingPage";
import { Dashboard } from "@/components/Dashboard";
import { ProductsScreen } from "@/components/ProductsScreen";
import { ProductForm } from "@/components/ProductForm";
import { ProductDetail } from "@/components/ProductDetail";
import { BatchForm } from "@/components/BatchForm";
import { SalesScreen } from "@/components/SalesScreen";
import { SalesForm } from "@/components/SalesForm";
import { SaleDetail } from "@/components/SaleDetail";
import { CustomersScreen } from "@/components/CustomersScreen";
import { CustomerForm } from "@/components/CustomerForm";
import { CustomerDetail } from "@/components/CustomerDetail";
import { AreaForm } from "@/components/AreaForm";
import { VendorsScreen } from "@/components/VendorsScreen";
import { VendorForm } from "@/components/VendorForm";
import { VendorDetail } from "@/components/VendorDetail";
import { PurchasesScreen } from "@/components/PurchasesScreen";
import { PurchaseForm } from "@/components/PurchaseForm";
import { PurchaseDetail } from "@/components/PurchaseDetail";
import { AccountsScreen } from "@/components/AccountsScreen";
import { AccountForm } from "@/components/AccountForm";
import { LedgerScreen } from "@/components/LedgerScreen";
import { TransactionDetail } from "@/components/TransactionDetail";
import { ReportsScreen } from "@/components/ReportsScreen";
import { MobileServerConfig } from "@/components/MobileServerConfig";

function App() {
  // HashRouter is required for Electron/file:// production builds.
  // BrowserRouter uses pathname which becomes /.../index.html under file:// and breaks route matching.
  return (
    <HashRouter>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/companies" element={<SplashScreen />} />
          <Route
            path="/database/config"
            element={<DatabaseConfiguration />}
          />
          <Route path="/company/new" element={<CompanyConfiguration />} />
          <Route path="/company/:companyId" element={<Dashboard />} />
          <Route path="/company/:companyId/products" element={<ProductsScreen />} />
          <Route path="/company/:companyId/products/new" element={<ProductForm />} />
          <Route path="/company/:companyId/products/:productId/edit" element={<ProductForm />} />
          <Route path="/company/:companyId/products/:productId" element={<ProductDetail />} />
          <Route path="/company/:companyId/products/:productId/batches/new" element={<BatchForm />} />
          <Route path="/company/:companyId/products/:productId/batches/:batchId/edit" element={<BatchForm />} />
          <Route path="/company/:companyId/sales" element={<SalesScreen />} />
          <Route path="/company/:companyId/sales/new" element={<SalesForm />} />
          <Route path="/company/:companyId/sales/:saleId" element={<SaleDetail />} />
          <Route path="/company/:companyId/customers" element={<CustomersScreen />} />
          <Route path="/company/:companyId/customers/new" element={<CustomerForm />} />
          <Route path="/company/:companyId/customers/:customerId" element={<CustomerDetail />} />
          <Route path="/company/:companyId/customers/:customerId/edit" element={<CustomerForm />} />
          <Route path="/company/:companyId/areas/new" element={<AreaForm />} />
          <Route path="/company/:companyId/vendors" element={<VendorsScreen />} />
          <Route path="/company/:companyId/vendors/new" element={<VendorForm />} />
          <Route path="/company/:companyId/vendors/:vendorId" element={<VendorDetail />} />
          <Route path="/company/:companyId/vendors/:vendorId/edit" element={<VendorForm />} />
          <Route path="/company/:companyId/purchases" element={<PurchasesScreen />} />
          <Route path="/company/:companyId/purchases/new" element={<PurchaseForm />} />
          <Route path="/company/:companyId/purchases/:purchaseId" element={<PurchaseDetail />} />
          <Route path="/company/:companyId/accounts" element={<AccountsScreen />} />
          <Route path="/company/:companyId/accounts/new" element={<AccountForm />} />
          <Route path="/company/:companyId/accounts/:accountId/edit" element={<AccountForm />} />
          <Route path="/company/:companyId/ledger" element={<LedgerScreen />} />
          <Route path="/company/:companyId/ledger/:transactionId" element={<TransactionDetail />} />
          <Route path="/company/:companyId/reports" element={<ReportsScreen />} />
          <Route path="/mobile-server" element={<MobileServerConfig />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;

