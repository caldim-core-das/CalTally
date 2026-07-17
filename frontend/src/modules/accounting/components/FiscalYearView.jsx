import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Lock, Unlock, Trash2 } from 'lucide-react';
import api from '../../../api';

export default function FiscalYearView() {
  const [fiscalYears, setFiscalYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFiscalYears = async () => {
    try {
      const response = await api.get('/fiscal-years');
      setFiscalYears(response.data.data);
    } catch (err) {
      console.error('Failed to fetch fiscal years', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiscalYears();
  }, []);

  const handleCloseYear = async (id) => {
    if (window.confirm('Are you sure you want to close this fiscal year? This will post closing entries to Retained Earnings and lock the period.')) {
      try {
        await api.post(`/fiscal-years/${id}/close`);
        fetchFiscalYears();
      } catch (err) {
        alert(err.response?.data?.error?.message || 'Failed to close fiscal year');
      }
    }
  };

  if (loading) return <div className="p-4">Loading fiscal years...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fiscal Years</h1>
          <p className="text-muted-foreground mt-2">Manage your company's financial years and year-end closing process.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Fiscal Year
        </Button>
      </div>

      <div className="grid gap-4">
        {fiscalYears.map((fy) => (
          <Card key={fy.id} className={fy.status === 'Closed' ? 'bg-muted/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>{fy.name}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {new Date(fy.startDate).toLocaleDateString()} — {new Date(fy.endDate).toLocaleDateString()}
                </div>
              </div>
              <Badge variant={fy.status === 'Open' ? 'default' : fy.status === 'Closed' ? 'secondary' : 'warning'}>
                {fy.status}
              </Badge>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              {fy.status === 'Open' && (
                <Button variant="outline" size="sm" onClick={() => handleCloseYear(fy.id)}>
                  <Lock className="mr-2 h-4 w-4" /> Close Year
                </Button>
              )}
              {fy.status === 'Closed' && (
                <Button variant="outline" size="sm" onClick={() => {
                  const reason = prompt('Reason for reopening?');
                  if (reason) {
                     api.post(`/fiscal-years/${fy.id}/reopen`, { reason })
                       .then(() => fetchFiscalYears())
                       .catch(e => alert(e.response?.data?.error?.message || 'Failed to reopen'));
                  }
                }}>
                  <Unlock className="mr-2 h-4 w-4" /> Reopen
                </Button>
              )}
              {fy.status === 'Open' && (
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {fiscalYears.length === 0 && (
          <div className="text-center p-8 border rounded-lg bg-muted/10">
            No fiscal years found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
