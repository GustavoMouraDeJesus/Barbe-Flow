export type AppointmentStatus = "pending" | "completed" | "canceled";

export type Appointment = {
  id: string;
  barbershopId: string;
  clientName: string;
  clientPhone?: string;
  serviceId: number;
  serviceName: string;
  serviceDurationMinutes: number;
  professionalId: number;
  professionalName: string;
  professionalSpecialty: string;
  date: string;
  time: string;
  price: number;
  status: AppointmentStatus;
};
