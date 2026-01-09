import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ShoppingCart,
  BookOpen,
  Users,
  BarChart3,
  Database,
  Zap,
  Shield,
  Globe,
  FileSpreadsheet,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import logo from "@/assets/logo.svg";
import { useAppStore } from "@/stores/useAppStore";

export function LandingPage() {
  const navigate = useNavigate();
  const { databaseConfig } = useAppStore();

  // If database is already configured, redirect to companies page
  useEffect(() => {
    if (databaseConfig) {
      navigate("/companies", { replace: true });
    }
  }, [databaseConfig, navigate]);

  const features = [
    {
      icon: Package,
      title: "Advanced Inventory Management",
      description: "Track products with SKU, pricing, categories, and comprehensive batch tracking with expiry dates.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: ShoppingCart,
      title: "Point of Sale (POS)",
      description: "Streamlined sales interface with batch deduction (FIFO or manual selection) and intelligent returns management.",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: BookOpen,
      title: "Double-Entry Accounting",
      description: "Full double-entry ledger system with configurable chart of accounts and automatic transaction generation.",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: Users,
      title: "CRM & SRM",
      description: "Complete customer and supplier relationship management with area-based categorization and history tracking.",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      icon: BarChart3,
      title: "Custom Reporting",
      description: "Dynamic query builder for personalized reports with PDF and Excel export capabilities.",
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
    {
      icon: Database,
      title: "Multi-Database Support",
      description: "Flexible database configuration - SQLite, PostgreSQL, MySQL, or MSSQL. Switch anytime without data loss.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  const benefits = [
    "Multi-company support with complete data isolation",
    "Batch tracking with expiry date management",
    "Excel import/export with template support",
    "Real-time inventory and financial reporting",
    "Role-based access control (Admin, Manager, Cashier)",
    "API-first architecture ready for cloud migration",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Navigation Bar */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={logo} alt="OmniLedger" className="h-8 w-auto" />
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/database/config")}
              >
                Settings
              </Button>
              <Button onClick={() => navigate("/database/config")}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Zap className="h-3 w-3 mr-1.5" />
              Desktop Inventory & Accounting System
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              OmniLedger
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              A comprehensive desktop solution for inventory management, sales tracking, and financial accounting.
              Built for modern businesses that need power, flexibility, and control.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                size="lg"
                className="text-lg px-8 py-6 h-auto"
                onClick={() => navigate("/database/config")}
              >
                <Database className="h-5 w-5 mr-2" />
                Configure Database
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 h-auto"
                onClick={() => navigate("/database/config")}
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Hero Image/Preview Placeholder */}
          <div className="mt-16 rounded-2xl border-2 border-border/50 bg-gradient-to-br from-white to-slate-50 p-8 shadow-2xl">
            <div className="aspect-video rounded-lg bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100 flex items-center justify-center">
              <div className="text-center">
                <img src={logo} alt="OmniLedger" className="h-24 w-auto mx-auto mb-4 opacity-90" />
                <p className="text-muted-foreground text-sm">Application Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to streamline your operations, from inventory management to financial reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
                >
                  <CardHeader>
                    <div
                      className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base mt-2">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                Why Choose OmniLedger
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Built for Growth and Flexibility
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                OmniLedger is designed with your business needs in mind. Whether you're a small retail store
                or a multi-location enterprise, our system scales with you.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-lg text-foreground">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 text-center border-2 hover:border-primary/50 transition-all">
                <Globe className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold text-lg mb-2">Cross-Platform</h3>
                <p className="text-sm text-muted-foreground">
                  Windows, macOS, and Linux support
                </p>
              </Card>
              <Card className="p-6 text-center border-2 hover:border-primary/50 transition-all">
                <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="font-semibold text-lg mb-2">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Your data stays on your machine
                </p>
              </Card>
              <Card className="p-6 text-center border-2 hover:border-primary/50 transition-all">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                <h3 className="font-semibold text-lg mb-2">Excel Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Import and export with ease
                </p>
              </Card>
              <Card className="p-6 text-center border-2 hover:border-primary/50 transition-all">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                <h3 className="font-semibold text-lg mb-2">Scalable</h3>
                <p className="text-sm text-muted-foreground">
                  Ready for cloud migration
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Set up your database configuration and start managing your business with OmniLedger.
            It takes just a few minutes to get started.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6 h-auto bg-white text-blue-600 hover:bg-blue-50"
              onClick={() => navigate("/database/config")}
            >
              <Database className="h-5 w-5 mr-2" />
              Configure Database
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 h-auto border-white text-white hover:bg-white/10"
              onClick={() => navigate("/database/config")}
            >
              View Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img src={logo} alt="OmniLedger" className="h-6 w-auto opacity-80" />
              <span className="text-sm text-muted-foreground">
                Desktop Inventory & Accounting System
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>© 2024 OmniLedger. Built with ❤️ for modern businesses.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}