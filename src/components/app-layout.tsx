"use client"

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Clapperboard, Film, LayoutDashboard, Loader2, Settings, Users, Handshake, MessageSquare, LifeBuoy, Contact, Heart, LogIn, Code } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarSeparator } from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import Link from 'next/link';

// Admin items
const adminNavItems = [
    { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/admin/manage-anime", label: "Manage Anime", icon: <Film className="h-5 w-5" /> },
    { href: "/admin/manage-users", label: "Manage Users", icon: <Users className="h-5 w-5" /> },
    { href: "/admin/manage-allies", label: "Manage Allies", icon: <Handshake className="h-5 w-5" /> },
    { href: "/admin/manage-developers", label: "Manage Devs", icon: <Code className="h-5 w-5" /> },
    { href: "/admin/staff-chat", label: "Staff Chat", icon: <MessageSquare className="h-5 w-5" /> },
    { href: "/admin/support-tickets", label: "Support Tickets", icon: <LifeBuoy className="h-5 w-5" /> },
];

// Regular user items
const userNavItems = [
    { href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard" },
    { href: "/allies", icon: <Handshake className="h-4 w-4" />, label: "Allies" },
    { href: "/developers", icon: <Code className="h-4 w-4" />, label: "Developers" },
    { href: "/profile", icon: <Users className="h-4 w-4" />, label: "Profile" },
    { href: "/settings", icon: <Settings className="h-4 w-4" />, label: "Settings" },
    { href: "/contact", icon: <Contact className="h-4 w-4" />, label: "Contact Us" },
    { href: "/donate", icon: <Heart className="h-4 w-4" />, label: "Donate" },
];

const guestNavItems = [
    { href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard" },
    { href: "/allies", icon: <Handshake className="h-4 w-4" />, label: "Allies" },
    { href: "/developers", icon: <Code className="h-4 w-4" />, label: "Developers" },
    { href: "/contact", icon: <Contact className="h-4 w-4" />, label: "Contact Us" },
    { href: "/donate", icon: <Heart className="h-4 w-4" />, label: "Donate" },
];


export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminRole = user && ['admin', 'co-owner', 'owner'].includes(user.role);

  let currentNavItems;
  if(isAuthenticated) {
    currentNavItems = isAdminRole ? adminNavItems : userNavItems;
  } else {
    currentNavItems = guestNavItems;
  }
  
  const currentHeaderTitle = isAdminPage ? 'Admin Panel' : 'AnimeVerse';
  const currentHeaderLink = isAdminPage ? '/admin' : '/dashboard';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className='p-4'>
          <Link href={currentHeaderLink} className='flex items-center gap-2'>
            <Clapperboard className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-headline font-bold">{currentHeaderTitle}</h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {currentNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href || (item.href !== '/' && item.href !== '/dashboard' && pathname.startsWith(item.href))} className="justify-start">
                        <Link href={item.href}>{item.icon}{item.label}</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
            <SidebarSeparator className="my-2" />
             {isAuthenticated && isAdminRole && !isAdminPage && (
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="/admin"><LayoutDashboard className="h-4 w-4" />Admin Panel</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
             {isAdminPage && (
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild className="justify-start font-semibold text-muted-foreground hover:text-foreground">
                        <Link href="/dashboard"><Clapperboard className="mr-2 h-5 w-5" />Ver Sitio</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
            {!isAuthenticated && (
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="/login"><LogIn className="h-4 w-4" />Iniciar Sesión</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-full flex-col">
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
              <SidebarTrigger className="md:hidden" />
              <div className="ml-auto">
                <UserNav />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in">
              {children}
            </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
