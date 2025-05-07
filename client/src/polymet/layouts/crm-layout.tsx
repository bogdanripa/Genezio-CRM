import { useState, useEffect, use } from "react";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  HomeIcon,
  UsersIcon,
  MenuIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AuthService } from "@genezio/auth";

export default function CrmLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();

  if (!currentUser) {
    AuthService.getInstance().userInfo().then((user) => {
      setCurrentUser(user);
    });
  }

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: HomeIcon,
      current: location.pathname === "/dashboard",
    },
    {
      name: "Accounts",
      href: "/accounts",
      icon: UsersIcon,
      current: location.pathname.startsWith("/accounts"),
    },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 flex items-center justify-between lg:justify-center">
        <Link
          to="/dashboard"
          className="text-xl font-bold tracking-tight flex items-center"
        >
          Genezio CRM
        </Link>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
          >
            <XIcon className="h-5 w-5" />
          </Button>
        )}
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              item.current
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              "group flex items-center px-3 py-2 text-sm font-medium rounded-md"
            )}
          >
            <item.icon
              className={cn(
                item.current
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground",
                "mr-3 h-5 w-5 flex-shrink-0"
              )}
              aria-hidden="true"
            />

            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for desktop */}
      <div
        className={cn(
          "hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r bg-card z-50"
        )}
      >
        <SidebarContent />
      </div>

      {/* Sidebar for mobile */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1 w-full">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-card border-b h-14">
          <div className="flex items-center flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <MenuIcon className="h-5 w-5" />

              <span className="sr-only">Open sidebar</span>
            </Button>
            <div className="ml-2 lg:ml-0 w-full max-w-md">
              <div className="relative text-muted-foreground focus-within:text-foreground">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <SearchIcon className="h-4 w-4" aria-hidden="true" />
                </div>
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full overflow-hidden"
                >
                  <Avatar className="h-12 w-12">
                    {currentUser?.avatar ? (
                      <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    ) : (
                      <AvatarFallback>
                        {currentUser?.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{currentUser?.name || "User"}</span>
                    <span className="text-xs text-muted-foreground">
                      {currentUser?.email || "user@example.com"}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem>
                  <Link to="/logout" className="w-full">
                    Sign out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
