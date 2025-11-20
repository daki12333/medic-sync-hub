import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface PatientSearchDropdownProps {
  value: string;
  onValueChange: (patientId: string) => void;
  onAddNewPatient: () => void;
  placeholder?: string;
  label?: string;
  hideLabel?: boolean;
}

export const PatientSearchDropdown: React.FC<PatientSearchDropdownProps> = ({
  value,
  onValueChange,
  onAddNewPatient,
  placeholder = "Pretraži pacijente...",
  label = "Pacijent",
  hideLabel = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    // Filter patients based on search term
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient => 
        `${patient.first_name} ${patient.last_name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  useEffect(() => {
    // Update selected patient when value changes
    if (value) {
      const patient = patients.find(p => p.id === value);
      if (patient) {
        setSelectedPatient(patient);
        setSearchTerm(`${patient.first_name} ${patient.last_name}`);
      }
    } else {
      setSelectedPatient(null);
      setSearchTerm('');
    }
  }, [value, patients]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search term if no patient selected
        if (!selectedPatient) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedPatient]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
      setFilteredPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // Clear selected patient if input is changed
    if (selectedPatient && newValue !== `${selectedPatient.first_name} ${selectedPatient.last_name}`) {
      setSelectedPatient(null);
      onValueChange('');
    }
  };

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm(`${patient.first_name} ${patient.last_name}`);
    onValueChange(patient.id);
    setIsOpen(false);
  };

  const handleAddNewPatient = () => {
    setIsOpen(false);
    onAddNewPatient();
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {!hideLabel ? (
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="patient-search">{label}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddNewPatient}
            className="text-xs"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Dodaj novog
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-end mb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddNewPatient}
            className="text-xs"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Dodaj novog
          </Button>
        </div>
      )}

      <div className="relative">
        <div className="flex">
          <Input
            id="patient-search"
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleDropdown}
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          >
            <ChevronDown 
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )} 
            />
          </Button>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredPatients.length > 0 ? (
              <div className="py-1">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => selectPatient(patient)}
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center justify-between",
                      selectedPatient?.id === patient.id && "bg-accent text-accent-foreground"
                    )}
                  >
                    <span>{patient.first_name} {patient.last_name}</span>
                    {selectedPatient?.id === patient.id && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            ) : searchTerm.trim() !== '' ? (
              <div className="py-2">
                <button
                  type="button"
                  onClick={handleAddNewPatient}
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Dodaj novog pacijenta: "{searchTerm}"
                </button>
              </div>
            ) : (
              <div className="py-2 px-3 text-sm text-muted-foreground">
                Nema pacijenata
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};