import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Mutation, NoteScope, Planning, SchoolHoliday, Slot, Stats, Zone } from './models';

export interface CabinetPayload {
  name: string; code: string; color: string;
  nurses: { id?: string; name: string }[];
  notes: { id?: string; text: string }[];
}

/** Appels HTTP de l'API Symfony. Chaque modification renvoie le planning complet à jour (voir PlanningSnapshot). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url = (p: string) => `${environment.apiUrl}/api${p}`;
  private send = <T = Mutation>(method: string, path: string, body?: unknown) =>
    firstValueFrom(this.http.request<T>(method, this.url(path), { body }));

  planning = () => this.send<Planning>('GET', '/planning');
  holidays = () => this.send<SchoolHoliday[]>('GET', '/holidays');
  stats = (from: string, to: string) => this.send<Stats>('GET', `/stats?from=${from}&to=${to}`);
  setZone = (zone: Zone) => this.send('PATCH', '/me', { zone });

  addDays = (dates: string[], cabinetId: string, nurseId: string | null, slot: Slot) => this.send('POST', '/days', { dates, cabinetId, nurseId, slot });
  updateDay = (id: string, cabinetId: string, nurseId: string | null, slot: Slot) => this.send('PUT', `/days/${id}`, { cabinetId, nurseId, slot });
  deleteDay = (id: string) => this.send('DELETE', `/days/${id}`);

  setRests = (dates: string[], slot: Slot, toggle: boolean) => this.send('POST', '/rests', { dates, slot, toggle });
  setRest = (date: string, slot: Slot) => this.send('PUT', `/rests/${date}`, { slot });
  deleteRest = (date: string) => this.send('DELETE', `/rests/${date}`);

  createCabinet = (c: CabinetPayload) => this.send('POST', '/cabinets', c);
  updateCabinet = (id: string, c: CabinetPayload) => this.send('PUT', `/cabinets/${id}`, c);
  deleteCabinet = (id: string) => this.send('DELETE', `/cabinets/${id}`);

  createNote = (n: { scope: NoteScope; text: string; date?: string; cabinetId?: string; nurseId?: string }) => this.send('POST', '/notes', n);
  updateNote = (id: string, text: string) => this.send('PUT', `/notes/${id}`, { text });
  deleteNote = (id: string) => this.send('DELETE', `/notes/${id}`);

  undo = (id: string) => this.send('POST', `/undo/${id}`);
}
