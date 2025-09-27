import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  ArrowLeft,
  Activity,
  AlertTriangle
} from 'lucide-react';

const Inventory = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
  }, [user, loading, navigate]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Učitavanje inventara...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="floating"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="btn-float"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad
            </Button>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-medical p-2 rounded-lg shadow-medical">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Inventar</h1>
                <p className="text-sm text-muted-foreground">Upravljanje zalihama</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="card-professional">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="text-xl text-foreground">Inventar u razvoju</CardTitle>
            <CardDescription className="text-muted-foreground">
              Modul za upravljanje zalihama je trenutno u razvoju. 
              Ova funkcionalnost će biti dostupna u budućim verzijama sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="premium" 
              className="btn-float"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vrati se na kontrolnu tablu
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Inventory;