import T from '../../theme';
import { Btn, Card, LoadingState } from '../ui';
import { inputStyle } from './shared';
import { WarehouseCard } from './WarehouseCard';

// ─── BrowseTab ───
export function BrowseTab({ warehousesState, loadWarehouses, filter, setFilter, setViewWarehouse, handleBook, filtered }) {
  return (
    <div>
      {/* Filters */}
      <Card style={{marginBottom:22,padding:16}}>
        <div className="ac-filter-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10,alignItems:'flex-end'}}>
          <div>
            <label htmlFor="browsetab-f1" style={{fontSize:10,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>SEARCH</label>
            <input id="browsetab-f1" value={filter.search} onChange={e=>setFilter(f=>({...f,search:e.target.value}))} placeholder="Warehouse name or city..." style={inputStyle}/>
          </div>
          <div>
            <label htmlFor="browsetab-f2" style={{fontSize:10,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>STORAGE TYPE</label>
            <select id="browsetab-f2" value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value}))} style={inputStyle}>
              {['All','Cold Storage','Dry Storage'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="browsetab-f3" style={{fontSize:10,fontWeight:700,color:T.muted,display:'block',marginBottom:5,letterSpacing:0.5}}>COMMODITY</label>
            <select id="browsetab-f3" value={filter.commodity} onChange={e=>setFilter(f=>({...f,commodity:e.target.value}))} style={inputStyle}>
              {['All','Rice','Wheat','Maize','Cotton','Pulses','Oil Seeds','Vegetables','Fruits'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <Btn variant="ghost" onClick={()=>setFilter({type:'All',province:'All',commodity:'All',search:''})}>Clear</Btn>
        </div>
      </Card>

      {warehousesState==='ready' && (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <span style={{fontSize:13,color:T.muted}}><strong style={{color:T.text}}>{filtered.length}</strong> warehouses found</span>
        </div>
      )}

      {warehousesState==='loading' && <LoadingState label="Loading warehouses…" />}
      {warehousesState==='error' && (
        <div style={{textAlign:'center',padding:'40px 20px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12}}>
          <div style={{fontSize:28,marginBottom:10}}>⚠️</div>
          <div style={{fontSize:13,fontWeight:700,color:'#B91C1C',marginBottom:4}}>Couldn't load warehouses</div>
          <div style={{fontSize:12,color:'#991B1B',marginBottom:16}}>Something went wrong talking to the server. Please try again.</div>
          <button onClick={loadWarehouses} style={{background:'#B91C1C',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Retry</button>
        </div>
      )}
      {warehousesState==='ready' && filtered.length===0 && (
        <div style={{textAlign:'center',padding:'48px 20px',color:T.muted}}>
          <div style={{fontSize:32,marginBottom:10}}>🏪</div>
          <div style={{fontSize:14,fontWeight:700,color:T.text}}>No warehouses match these filters</div>
        </div>
      )}
      {warehousesState==='ready' && filtered.length>0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
          {filtered.map(w=>(
            <WarehouseCard key={w.id} w={w} onBook={handleBook} onView={setViewWarehouse}/>
          ))}
        </div>
      )}
    </div>
  );
}
