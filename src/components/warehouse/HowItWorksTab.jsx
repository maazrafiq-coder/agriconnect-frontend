import T from '../../theme';
import { Card } from '../ui';
import { amber } from './shared';

// ─── HowItWorksTab ───
export function HowItWorksTab() {
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',gap:20,marginBottom:28}}>
        {/* Storage flow */}
        <Card>
          <h3 style={{margin:'0 0 18px',fontSize:15,fontWeight:800,color:T.green}}>🏪 How Storage Works</h3>
          {[
            ['1','Browse Warehouses','Search by commodity, location, and storage type. Compare rates and facilities.'],
            ['2','Book & Confirm','Select duration, pay the booking fee, and schedule your delivery date.'],
            ['3','Deliver Commodity','Bring your goods to the warehouse. They are weighed and quality-checked on arrival.'],
            ['4','Receive DWR','You receive a Digital Warehouse Receipt — a legally valid document proving ownership.'],
            ['5','Sell or Finance','Use the DWR to get a bank loan, or sell from storage directly on the marketplace.'],
          ].map(([n,title,desc])=>(
            <div key={n} style={{display:'flex',gap:12,marginBottom:14}}>
              <div style={{width:26,height:26,borderRadius:'50%',background:T.green,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,flexShrink:0}}>{n}</div>
              <div><div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:2}}>{title}</div><div style={{fontSize:12,color:T.muted,lineHeight:1.5}}>{desc}</div></div>
            </div>
          ))}
        </Card>

        {/* DWR financing flow */}
        <Card>
          <h3 style={{margin:'0 0 18px',fontSize:15,fontWeight:800,color:amber}}>🏦 DWR Bank Financing</h3>
          {[
            ['1','Get a DWR','After storing your commodity, you receive a Digital Warehouse Receipt (DWR).'],
            ['2','Apply for Loan','Submit your DWR to a bank partner. Eligible for up to 70% of commodity value.'],
            ['3','Bank Places Lien','The bank places a lien on the stored goods as collateral security.'],
            ['4','Receive Financing','Loan disbursed within 2–5 working days (ZTBL, NBP, HBL processing).'],
            ['5','Repay & Release','Once you repay, the lien is lifted and you regain full ownership of the DWR.'],
          ].map(([n,title,desc])=>(
            <div key={n} style={{display:'flex',gap:12,marginBottom:14}}>
              <div style={{width:26,height:26,borderRadius:'50%',background:'#92400E',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,flexShrink:0}}>{n}</div>
              <div><div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:2}}>{title}</div><div style={{fontSize:12,color:T.muted,lineHeight:1.5}}>{desc}</div></div>
            </div>
          ))}
        </Card>
      </div>

      {/* Eligible loans */}
      <Card style={{marginBottom:20}}>
        <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:800,color:T.green}}>🏦 Bank Partners & Eligible Loan Products</h3>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:T.green}}>
                {['Bank','Loan Product','Max Financing','Rate','Processing Time'].map(h=>(
                  <th key={h} style={{padding:'9px 12px',color:'#fff',textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['ZTBL','Agri Passbook / DWR Finance','70% of value','6–9% p.a.','3–5 days'],
                ['National Bank of Pakistan','NBP Agri Loan','65% of value','8–10% p.a.','5–7 days'],
                ['HBL','HBL Agriculture Finance','70% of value','9–12% p.a.','3–4 days'],
                ['MCB Bank','MCB Agri Lending','60% of value','10–12% p.a.','4–6 days'],
                ['Bank Alfalah','Agri DWR Product','65% of value','9–11% p.a.','3–5 days'],
              ].map((row,i)=>(
                <tr key={i} style={{background:i%2===0?T.surface:T.white}}>
                  {row.map((cell,j)=>(
                    <td key={j} style={{padding:'8px 12px',borderBottom:`1px solid ${T.border}`,fontWeight:j===0?700:400,color:j===2?T.teal:j===3?amber:T.text}}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Note */}
      <Card style={{background:'#F9FAFB',border:`1px solid ${T.border}`}}>
        <div style={{fontWeight:700,fontSize:13,color:T.green,marginBottom:6}}>ℹ️ About Digital Receipts</div>
        <p style={{fontSize:12,color:T.muted,lineHeight:1.65,margin:0}}>A Digital Warehouse Receipt records the goods a warehouse is holding for you. It is a platform record, not a bank instrument: any loan against it is decided and priced by the bank, and any insurance is offered under the warehouse's own terms.</p>
      </Card>
    </div>
  );
}
