export const PRODUCTS = [
  { id:1, name:'1121 Basmati', stage:'Milled White', variety:'1121 Basmati', cat:'Rice', seller:'Khan Rice Mills', sellerVerified:true, sellerRating:4.8, sellerReviews:124, location:'Sheikhupura, Punjab', qty:500, unit:'40kg bags', minOrder:50, price:3800, harvest:'Oct 2024', badge:'Premium', desc:'Premium 1121 Basmati from certified fields. Extra long grain, excellent aroma, export-grade quality preferred by Middle East markets.', metrics:{moisture:12.5,length:7.8,width:1.85,broken:2.1,purity:98.5,whiteness:42,chalk:3.2,milling:68.5}, certs:['Punjab Food Authority','Export Quality Certified'] },
  { id:2, name:'1509 Basmati', stage:'Milled White', variety:'1509 Basmati', cat:'Rice', seller:'Gujranwala Grain Co.', sellerVerified:true, sellerRating:4.6, sellerReviews:87, location:'Gujranwala, Punjab', qty:800, unit:'40kg bags', minOrder:100, price:3200, harvest:'Nov 2024', badge:'Verified', desc:'High-yield 1509 Basmati, popular for domestic and regional export markets. Consistent quality batch after batch.', metrics:{moisture:13.0,length:7.2,width:1.9,broken:3.5,purity:97.2,whiteness:39,chalk:4.1,milling:67.0}, certs:['PASSCO Certified'] },
  { id:3, name:'Super Basmati', stage:'White Rice', variety:'Super Basmati', cat:'Rice', seller:'Lahore Agro Exports', sellerVerified:true, sellerRating:4.9, sellerReviews:212, location:'Lahore, Punjab', qty:300, unit:'50kg bags', minOrder:30, price:4100, harvest:'Oct 2024', badge:'Export Grade', desc:'Super Basmati with superior aroma and extra long grain. The gold standard for export. RRI Kala Shah Kaku certified.', metrics:{moisture:11.8,length:8.1,width:1.78,broken:1.5,purity:99.0,whiteness:44,chalk:2.8,milling:70.0}, certs:['Export Quality','Halal Certified','RRI Kala Shah Kaku'] },
  { id:4, name:'IRRI-6 Paddy', stage:'Paddy', variety:'IRRI-6', cat:'Paddy', seller:'Sindh Paddy Farms', sellerVerified:false, sellerRating:4.2, sellerReviews:45, location:'Larkana, Sindh', qty:2000, unit:'maunds', minOrder:200, price:1900, harvest:'Dec 2024', badge:'Bulk', desc:'IRRI-6 paddy straight from the fields. High milling yield, ideal for millers looking for consistent volume.', metrics:{moisture:15.2,length:6.1,width:2.1,broken:5.0,purity:95.0,whiteness:36,chalk:6.0,milling:65.0}, certs:[] },
  { id:5, name:'PK-386', stage:'Brown Rice', variety:'PK-386', cat:'Rice', seller:'Multan Mills Ltd', sellerVerified:true, sellerRating:4.5, sellerReviews:63, location:'Multan, Punjab', qty:400, unit:'40kg bags', minOrder:40, price:2600, harvest:'Nov 2024', badge:'New', desc:'PK-386 Brown Rice, partially milled for health-conscious consumers and food processors.', metrics:{moisture:13.5,length:6.8,width:2.0,broken:3.0,purity:96.5,whiteness:28,chalk:4.5,milling:66.0}, certs:['Punjab Food Authority'] },
  { id:6, name:'KS-282', stage:'Milled White', variety:'KS-282', cat:'Rice', seller:'Faisalabad Grain Depot', sellerVerified:true, sellerRating:4.4, sellerReviews:78, location:'Faisalabad, Punjab', qty:600, unit:'40kg bags', minOrder:60, price:2900, harvest:'Oct 2024', badge:'Verified', desc:'KS-282 milled rice, medium grain with consistent quality suitable for institutional buyers.', metrics:{moisture:12.8,length:6.5,width:1.95,broken:4.0,purity:96.0,whiteness:40,chalk:5.0,milling:67.5}, certs:['PASSCO Certified'] },
  { id:7, name:'Super Kernel', stage:'Milled White', variety:'Super Kernel', cat:'Rice', seller:'Khan Rice Mills', sellerVerified:true, sellerRating:4.8, sellerReviews:124, location:'Sheikhupura, Punjab', qty:250, unit:'50kg bags', minOrder:25, price:3500, harvest:'Nov 2024', badge:'Premium', desc:'Super Kernel long grain milled rice with excellent cooking quality and distinctive aroma.', metrics:{moisture:12.2,length:7.5,width:1.82,broken:2.5,purity:98.0,whiteness:41,chalk:3.5,milling:69.0}, certs:['Export Quality','Punjab Food Authority'] },
  { id:8, name:'IRRI-9 Paddy', stage:'Paddy', variety:'IRRI-9', cat:'Paddy', seller:'KPK Agri Traders', sellerVerified:false, sellerRating:4.0, sellerReviews:28, location:'Peshawar, KPK', qty:1500, unit:'maunds', minOrder:150, price:2100, harvest:'Dec 2024', badge:'Bulk', desc:'IRRI-9 paddy from the fertile KPK region. Medium grain, good milling recovery, competitive pricing.', metrics:{moisture:14.8,length:6.3,width:2.05,broken:4.5,purity:94.5,whiteness:35,chalk:5.5,milling:64.5}, certs:[] },
];

export const AGENCIES = [
  { id:1, name:'Punjab Food Authority Lab', city:'Lahore', province:'Punjab', rating:4.8, reviews:234, turnaround:'24–48 hr', price:2500, accred:['ISO 17025','PNAC Accredited'], services:['Moisture','Grain Size','Broken %','Whiteness Index','Milling Yield','Purity Analysis'] },
  { id:2, name:'PASSCO Quality Control Centre', city:'Islamabad', province:'Federal', rating:4.6, reviews:178, turnaround:'48–72 hr', price:1800, accred:['PASSCO Approved','Govt. Certified'], services:['Moisture','Grain Size','Broken %','Purity','Foreign Matter'] },
  { id:3, name:'Sindh Agriculture Testing Lab', city:'Karachi', province:'Sindh', rating:4.4, reviews:95, turnaround:'48 hr', price:2200, accred:['Sindh Agri Dept.'], services:['Moisture','Grain Size','Broken %','Whiteness Index','Chalkiness'] },
  { id:4, name:'Pakistan Standards & QC Institute', city:'Lahore', province:'Punjab', rating:4.9, reviews:312, turnaround:'72 hr', price:3500, accred:['PSQCA','ISO 17025','Export Cert Authority'], services:['Full Panel','Export Certification','Contaminant Screen','Heavy Metals','Aflatoxin'] },
];

export const TRANSPORTERS = [
  { id:1, name:'Pak Logistics Express', rating:4.7, reviews:189, vehicles:['20-ton Truck','Container','Refrigerated Van'], provinces:['Punjab','Sindh','KPK','Balochistan'], price:'₨35–55/km', capacity:'Up to 40 tons', insurance:true, gps:true },
  { id:2, name:'Punjab Transport Co.', rating:4.5, reviews:142, vehicles:['10-ton Truck','20-ton Truck','Flatbed'], provinces:['Punjab','KPK'], price:'₨28–45/km', capacity:'Up to 25 tons', insurance:true, gps:true },
  { id:3, name:'National Freight Services', rating:4.3, reviews:78, vehicles:['5-ton','10-ton','20-ton Truck','Container'], provinces:['All Pakistan'], price:'₨30–60/km', capacity:'Up to 50 tons', insurance:false, gps:true },
  { id:4, name:'Swift Cargo Pakistan', rating:4.6, reviews:113, vehicles:['10-ton Truck','20-ton Truck'], provinces:['Punjab','Sindh'], price:'₨32–50/km', capacity:'Up to 30 tons', insurance:true, gps:false },
];

export const BADGE_TYPE = { 'Premium':'gold', 'Export Grade':'blue', 'Verified':'green', 'Bulk':'gray', 'New':'blue' };

export const STATUS_COLORS = {
  pending:    { bg:'#FEF3C7', c:'#B45309',  l:'Pending'    },
  accepted:   { bg:'#DCFCE7', c:'#15803D',  l:'Accepted'   },
  confirmed:  { bg:'#DBEAFE', c:'#1D4ED8',  l:'Confirmed'  },
  in_transit: { bg:'#E0E7FF', c:'#4338CA',  l:'In Transit' },
  delivered:  { bg:'#DCFCE7', c:'#15803D',  l:'Delivered'  },
  completed:  { bg:'#DCFCE7', c:'#15803D',  l:'Completed'  },
  scheduled:  { bg:'#DBEAFE', c:'#1D4ED8',  l:'Scheduled'  },
  rejected:   { bg:'#FEE2E2', c:'#DC2626',  l:'Rejected'   },
  cancelled:  { bg:'#F3F4F6', c:'#6B7280',  l:'Cancelled'  },
  disputed:   { bg:'#FEE2E2', c:'#B91C1C',  l:'Disputed'   },
};
