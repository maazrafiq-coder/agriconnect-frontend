import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../lib/api', async (orig) => ({ ...(await orig()), apiTrackShipment: vi.fn() }));
import { apiTrackShipment } from '../lib/api';
import TrackingPage from './TrackingPage';

const renderPage = () => render(<MemoryRouter initialEntries={['/track/t1']}><Routes><Route path="/track/:id" element={<TrackingPage />} /></Routes></MemoryRouter>);

describe('TrackingPage (public)', () => {
  it('shows the shipment reference and only a masked driver name — never a phone, plate or price', async () => {
    apiTrackShipment.mockResolvedValue({ id: 't1', requestRef: 'TRQ-2026-000009', status: 'IN_TRANSIT', pickupCity: 'Lahore', deliveryCity: 'Karachi', driverName: 'Ali K.', vehicleType: 'LARGE_TRUCK', currentLocation: 'Multan' });
    renderPage();
    expect(await screen.findByText('Request ref TRQ-2026-000009')).toBeInTheDocument();
    expect(screen.getByText(/Driver: Ali K\./)).toBeInTheDocument();
    expect(screen.getByTestId('tracking-privacy')).toHaveTextContent(/after they sign in/);
    expect(document.body.textContent).not.toMatch(/\+92|LEA-|₨/);
  });

  it('a delivered public view still reads as delivered', async () => {
    apiTrackShipment.mockResolvedValue({ id: 't1', status: 'DELIVERED', pickupCity: 'A', deliveryCity: 'B', deliveredAt: '2030-01-01T10:00:00Z' });
    renderPage();
    expect(await screen.findAllByText('Delivered')).not.toHaveLength(0);
  });

  it('an unknown shipment shows a friendly error', async () => {
    apiTrackShipment.mockRejectedValue(new Error('nope'));
    renderPage();
    expect(await screen.findByText(/couldn't find that shipment/i)).toBeInTheDocument();
  });
});
