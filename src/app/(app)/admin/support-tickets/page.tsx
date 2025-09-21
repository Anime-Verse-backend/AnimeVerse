"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import type { SupportTicket } from '@/lib/types';
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
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, CheckCircle, Archive, LifeBuoy, CircleDashed, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    api.getSupportTickets()
      .then(data => setTickets(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateStatus = async (ticketId: number, status: 'open' | 'closed' | 'in-progress') => {
    try {
      const updatedTicket = await api.updateTicketStatus(ticketId, status);
      setTickets(tickets.map(t => (t.id === ticketId ? updatedTicket : t)));
      toast({
        title: 'Ticket Updated',
        description: `Ticket #${ticketId} has been marked as ${status}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update ticket status.',
      });
    }
  };

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const openTickets = tickets.filter(t => t.status === 'open').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <LifeBuoy />
            Support Tickets
        </h1>
        <p className="text-muted-foreground">Review and manage user support requests.</p>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>
                {openTickets > 0 
                ? `You have ${openTickets} open ticket${openTickets !== 1 ? 's' : ''}.`
                : 'Your inbox is clear.'
                }
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tickets.length === 0 ? (
                         <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No tickets yet. Your inbox is clear!
                            </TableCell>
                        </TableRow>
                    ) : tickets.map(ticket => (
                    <TableRow key={ticket.id}>
                        <TableCell>
                            {ticket.user ? (
                                <Link href={`/profile/${ticket.user.username}`} className="font-medium text-primary hover:underline">
                                    {ticket.user.name}
                                </Link>
                            ) : (
                                <div className="font-medium">{ticket.userEmail}</div>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{ticket.subject}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</div>
                        </TableCell>
                        <TableCell>
                        <Badge variant={ticket.status === 'open' ? 'destructive' : (ticket.status === 'in-progress' ? 'default' : 'secondary')} className="capitalize">
                            {ticket.status}
                        </Badge>
                        </TableCell>
                        <TableCell>{formatDistanceToNow(new Date(ticket.timestamp), { addSuffix: true })}</TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, 'in-progress')}>
                                <CircleDashed className="mr-2 h-4 w-4" /> Mark as In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, 'closed')}>
                                <Archive className="mr-2 h-4 w-4" /> Mark as Closed
                            </DropdownMenuItem>
                             {ticket.status !== 'open' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, 'open')}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Re-open Ticket
                                </DropdownMenuItem>
                             )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
