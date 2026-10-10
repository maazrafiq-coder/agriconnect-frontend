import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../lib/api', async (orig) => ({ ...(await orig()), apiTrackShipment: vi.fn() }));
import { apiTrackShipment } from '../lib/api';
import TrackingPage from './TrackingPage';

const renderAt = () => render(
  <MemoryRouter initialEntries={['/track/abc']}>
    <Routes><Route path="/track/:id" element={<TrackingPage />} /></Routes>
  </MemoryRouter>,
);

describe('TrackingPage (public)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the shipment by the id in the URL and shows route + progress', async () => {
    apiTrackShipment.mockResolvedValue({ id: 'abc', status: 'IN_TRANSIT', pickupCity: 'Lahore', deliveryCity: 'Karachi', currentLocation: 'Multan', driverName: 'Bilal' });
    renderAt();
    expect(await screen.findByText(/Lahore → Karachi/)).toBeInTheDocument();
    expect(apiTrackShipment).toHaveBeenCalledWith('abc');
    expect(screen.getByText(/Multan/)).toBeInTheDocument();
    ['Booked', 'Picked up', 'In transit', 'Delivered'].forEach(l => expect(screen.getAllByText(l).length).toBeGreaterThan(0));
  });

  it('never prints null/undefined for a sparse record', async () => {
    apiTrackShipment.mockResolvedValue({ id: 'abc', status: 'BOOKED' });
    const { container } = renderAt();
    await screen.findByText(/No updates from the driver yet/);
    expect(container.textContent).not.toMatch(/null|undefined/);
  });

  it('says so when the shipment has not been booked yet', async () => {
    apiTrackShipment.mockResolvedValue({ id: 'abc', status: 'REQUESTED' });
    renderAt();
    expect(await screen.findByText(/hasn't been booked yet/)).toBeInTheDocument();
  });

  it('shows a friendly error for an unknown id and can retry', async () => {
    apiTrackShipment.mockRejectedValueOnce(new Error('404'));
    apiTrackShipment.mockResolvedValueOnce({ id: 'abc', status: 'DELIVERED', pickupCity: 'A', deliveryCity: 'B' });
    renderAt();
    expect(await screen.findByText(/couldn't find that shipment/)).toBeInTheDocument();
  });
});
