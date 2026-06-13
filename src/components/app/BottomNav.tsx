import { Link, useLocation } from "@tanstack/react-router";
import {
  Home, MessageCircle, CreditCard, Wallet, Shield,
  LayoutDashboard, Package, Users, AlertTriangle, Sparkles, Receipt,
} from "lucide-react";

const customerNav = [
  { to: "/app/customer", label: "Home", icon: Home, exact: true },
  { to: "/app/customer/voice", label: "Talk", icon: MessageCircle },
  { to: "/app/customer/credit", label: "Credit", icon: CreditCard },
  { to: "/app/customer/repayments", label: "Pay", icon: Wallet },
  { to: "/app/customer/trust", label: "Trust", icon: Shield },
];

const shopNav = [
  { to: "/app/shopkeeper", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/app/shopkeeper/orders", label: "Orders", icon: Package },
  { to: "/app/shopkeeper/ledger", label: "Ledger", icon: Users },
  { to: "/app/shopkeeper/collections", label: "Dues", icon: AlertTriangle },
  { to: "/app/shopkeeper/insights", label: "AI", icon: Sparkles },
  { to: "/app/shopkeeper/procurement", label: "Stock", icon: Receipt },
];

export function BottomNav() {
  const pathname = useLocation({ select: (s) => s.pathname });
  if (!pathname.startsWith("/app/")) return null;
  const items = pathname.startsWith("/app/shopkeeper") ? shopNav : customerNav;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-emerald" : "text-ink-subtle"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${active ? "stroke-[2.4]" : ""}`} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
