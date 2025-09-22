"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Trash, Loader2, Crown, ShieldCheck, UserCog, Ban, CheckCircle, UserX, Shield, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [userToAction, setUserToAction] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'changeRole' | 'changeStatus' | null>(null);
  const [newData, setNewData] = useState<Partial<User> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const fetchUsers = (query?: string) => {
    setLoading(true);
    api.getUsers(query)
      .then(data => setUsers(data.sort((a, b) => {
          const roleOrder = { owner: 0, 'co-owner': 1, admin: 2, user: 3 };
          return roleOrder[a.role] - roleOrder[b.role];
      })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
        fetchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const openConfirmationDialog = (user: User, type: 'delete' | 'changeRole' | 'changeStatus', data?: Partial<User>) => {
      setUserToAction(user);
      setActionType(type);
      if (data) setNewData(data);
      setIsAlertOpen(true);
  };
  
  const handleConfirmAction = async () => {
    if (!userToAction || !actionType) return;

    try {
        let updatedUser: User | null = null;
        if (actionType === 'delete') {
            await api.deleteUser(userToAction.id);
            setUsers(users.filter(u => u.id !== userToAction.id));
            toast({ title: "Success", description: "User deleted successfully." });
        } else if (actionType === 'changeRole' && newData?.role) {
            updatedUser = await api.updateUserRole(userToAction.id, newData.role);
            toast({ title: "Success", description: "User role updated successfully."});
        } else if (actionType === 'changeStatus' && newData?.status) {
            updatedUser = await api.updateUserStatus(userToAction.id, newData.status);
            toast({ title: "Success", description: `User has been ${newData.status}.` });
        }
        if (updatedUser) {
             setUsers(users.map(u => u.id === userToAction.id ? updatedUser! : u));
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Error", description: error.message || "An unexpected error occurred." });
    } finally {
        setIsAlertOpen(false);
        setUserToAction(null);
        setActionType(null);
        setNewData(null);
    }
  };

  const getDialogContent = () => {
      if (!userToAction) return { title: '', description: '', actionText: ''};
      switch(actionType) {
        case 'delete':
            return {
                title: `Are you sure you want to delete ${userToAction.name}?`,
                description: "This action cannot be undone. This will permanently delete the user's account.",
                actionText: "Delete",
            }
        case 'changeRole':
            return {
                title: `Confirm Role Change`,
                description: `Are you sure you want to change ${userToAction.name}'s role to ${newData?.role}?`,
                actionText: "Confirm",
            }
        case 'changeStatus':
             return {
                title: `Confirm Status Change`,
                description: `Are you sure you want to ${newData?.status === 'disabled' ? 'disable' : 'enable'} ${userToAction.name}'s account?`,
                actionText: newData?.status === 'disabled' ? 'Disable' : 'Enable',
            }
        default:
            return { title: '', description: '', actionText: '' };
      }
  }
  
  const canPerformActions = (targetUser: User) => {
    if (!currentUser) return false;
    if (currentUser.id === targetUser.id || targetUser.role === 'owner') return false;
    if (currentUser.role === 'owner') return true;
    if (currentUser.role === 'co-owner' && targetUser.role !== 'co-owner') return true;
    return false;
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Users</h1>
          <p className="text-muted-foreground">View and manage user accounts.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Search for a user by name or email..."
          className="pl-10 text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border rounded-lg">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                </TableRow>
              ) : users.length > 0 ? users.map(user => (
                <TableRow key={user.id} className={cn(user.status === 'disabled' && 'bg-muted/50 text-muted-foreground')}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                          <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png`} alt={user.name} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                          <div className="font-medium flex items-center gap-2">
                              {user.name} 
                              {user.role === 'owner' && <Crown className="h-4 w-4 text-yellow-400" />}
                          </div>
                          <div className="text-sm">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'owner' ? 'default' : 'secondary'} className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                      <Badge variant={user.status === 'active' ? 'secondary' : 'destructive'} className="capitalize">
                          {user.status}
                      </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(user.joined), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={!canPerformActions(user)}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => openConfirmationDialog(user, 'changeStatus', { status: user.status === 'active' ? 'disabled' : 'active' })}>
                            {user.status === 'active' ? <><Ban className="mr-2 h-4 w-4" /> Disable Account</> : <><CheckCircle className="mr-2 h-4 w-4" /> Enable Account</>}
                         </DropdownMenuItem>

                         <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Shield className="mr-2 h-4 w-4" /> Change Role
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => openConfirmationDialog(user, 'changeRole', { role: 'admin' })}><UserCog className="mr-2 h-4 w-4" /> Set as Admin</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openConfirmationDialog(user, 'changeRole', { role: 'user' })}><UserX className="mr-2 h-4 w-4" /> Set as User</DropdownMenuItem>
                                    {currentUser?.role === 'owner' && <DropdownMenuItem onClick={() => openConfirmationDialog(user, 'changeRole', { role: 'co-owner' })}><ShieldCheck className="mr-2 h-4 w-4" /> Set as Co-Owner</DropdownMenuItem>}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                         </DropdownMenuSub>

                         <DropdownMenuSeparator />
                         <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => openConfirmationDialog(user, 'delete')}>
                           <Trash className="mr-2 h-4 w-4" /> Delete User
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No users found for "{searchTerm}".
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{getDialogContent().title}</AlertDialogTitle>
                <AlertDialogDescription>
                   {getDialogContent().description}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmAction} className={actionType === 'delete' || (actionType === 'changeStatus' && newData?.status === 'disabled') ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
                    {getDialogContent().actionText}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
