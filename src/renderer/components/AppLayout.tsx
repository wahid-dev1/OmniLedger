import { Link, useParams, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, Home, BookOpen, FileText, Building2, ShoppingBag, BarChart3, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { companyId } = useParams<{ companyId: string }>();
  const location = useLocation();

  const navItems = [
    { path: `/company/${companyId}`, label: "Dashboard", icon: LayoutDashboard },
    { path: `/company/${companyId}/products`, label: "Products", icon: Package },
    { path: `/company/${companyId}/sales`, label: "Sales", icon: ShoppingCart },
    { path: `/company/${companyId}/purchases`, label: "Purchases", icon: ShoppingBag },
    { path: `/company/${companyId}/customers`, label: "Customers", icon: Users },
    { path: `/company/${companyId}/vendors`, label: "Vendors", icon: Building2 },
    { path: `/company/${companyId}/accounts`, label: "Accounts", icon: FileText },
    { path: `/company/${companyId}/ledger`, label: "Ledger", icon: BookOpen },
    { path: `/company/${companyId}/reports`, label: "Reports", icon: BarChart3 },
  ];

  const globalNavItems = [
    { path: "/", label: "Companies", icon: Building2 },
    { path: "/database/config", label: "Database Settings", icon: Database },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 border-r bg-card">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <Home className="h-6 w-6" />
            <span className="font-bold text-lg">OmniLedger</span>
          </Link>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Global Navigation - Companies & Settings */}
          <div className="mt-8 pt-6 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              System
            </p>
            <nav className="space-y-2">
              {globalNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        isActive && "bg-primary text-primary-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {children}
      </div>
    </div>
  );
}

