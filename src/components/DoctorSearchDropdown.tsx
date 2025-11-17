import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Doctor {
  id: string;
  full_name: string;
  specialization: string | null;
}

interface DoctorSearchDropdownProps {
  value: string;
  onValueChange: (doctorId: string) => void;
  placeholder?: string;
  label?: string;
}

export const DoctorSearchDropdown: React.FC<DoctorSearchDropdownProps> = ({
  value,
  onValueChange,
  placeholder = "Pretraži lekare...",
  label = "Lekar"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    // Filter doctors based on search term
    if (searchTerm.trim() === '') {
      setFilteredDoctors(doctors);
    } else {
      const filtered = doctors.filter(doctor => 
        doctor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doctor.specialization && doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredDoctors(filtered);
    }
  }, [searchTerm, doctors]);

  useEffect(() => {
    // Update selected doctor when value changes
    if (value) {
      const doctor = doctors.find(d => d.id === value);
      if (doctor) {
        setSelectedDoctor(doctor);
        const displayText = doctor.specialization 
          ? `${doctor.full_name} (${doctor.specialization})`
          : doctor.full_name;
        setSearchTerm(displayText);
      }
    } else {
      setSelectedDoctor(null);
      setSearchTerm('');
    }
  }, [value, doctors]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search term if no doctor selected
        if (!selectedDoctor) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedDoctor]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, specialization')
        .eq('is_active', true)
        .in('role', ['doctor'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      
      const formattedDoctors = (data || []).map(d => ({
        id: d.user_id,
        full_name: d.full_name || 'Bez imena',
        specialization: d.specialization
      }));
      
      setDoctors(formattedDoctors);
      setFilteredDoctors(formattedDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // Clear selected doctor if input is changed
    if (selectedDoctor) {
      const expectedText = selectedDoctor.specialization 
        ? `${selectedDoctor.full_name} (${selectedDoctor.specialization})`
        : selectedDoctor.full_name;
      if (newValue !== expectedText) {
        setSelectedDoctor(null);
        onValueChange('');
      }
    }
  };

  const selectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    const displayText = doctor.specialization 
      ? `${doctor.full_name} (${doctor.specialization})`
      : doctor.full_name;
    setSearchTerm(displayText);
    onValueChange(doctor.id);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label>{label}</Label>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="pr-8"
              disabled={filteredDoctors.length === 0 && selectedDoctor !== null}
            />
            <button
              type="button"
              onClick={toggleDropdown}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={filteredDoctors.length === 0 && selectedDoctor !== null}
            >
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "transform rotate-180"
              )} />
            </button>
          </div>
        </div>

        {isOpen && filteredDoctors.length > 0 && (
          <div className="absolute z-[100] w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="py-1">
              {filteredDoctors.map((doctor) => (
                <button
                  key={doctor.id}
                  type="button"
                  onClick={() => selectDoctor(doctor)}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between",
                    selectedDoctor?.id === doctor.id && "bg-accent"
                  )}
                >
                  <div>
                    <div className="font-medium">{doctor.full_name}</div>
                    {doctor.specialization && (
                      <div className="text-xs text-muted-foreground">{doctor.specialization}</div>
                    )}
                  </div>
                  {selectedDoctor?.id === doctor.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
