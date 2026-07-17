import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Lock } from 'lucide-react';
import api from '../../../api';

export default function PeriodLockView() {
  const [lockDate, setLockDate] = useState('');
  const [reason, setReason] = useState('');
  const [currentLock, setCurrentLock] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLock = async () => {
    try {
      // In a real app, this would fetch the current PeriodLock for the company
      const response = await api.get('/accounting/period-lock');
      setCurrentLock(response.data.data);
      if (response.data.data?.lockDate) {
        setLockDate(response.data.data.lockDate.split('T')[0]);
      }
    } catch (err) {
      console.error('Failed to fetch period lock', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLock();
  }, []);

  const handleApplyLock = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounting/period-lock', { lockDate, reason });
      alert('Period lock applied successfully.');
      fetchLock();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to apply period lock');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Period Lock</h1>
        <p className="text-muted-foreground mt-2">
          Prevent users from creating, modifying, or deleting transactions before a specific date. 
          Useful for ensuring data integrity after monthly or quarterly reconciliations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-500" />
            Current Lock Status
          </CardTitle>
          <CardDescription>
            {currentLock 
              ? `Transactions before ${new Date(currentLock.lockDate).toLocaleDateString()} are currently locked.`
              : 'No period lock is currently active.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApplyLock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lockDate">Lock Date (Inclusive)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="lockDate"
                  type="date" 
                  className="pl-9"
                  value={lockDate}
                  onChange={(e) => setLockDate(e.target.value)}
                  required 
                />
              </div>
              <p className="text-sm text-muted-foreground">
                All transactions on or before this date will become read-only for standard users.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input 
                id="reason"
                placeholder="e.g. Q1 Books Closed"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full">
              Apply Period Lock
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
