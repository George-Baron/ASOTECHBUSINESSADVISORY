"""Builds packages/business-logic/data/services.json from the master blueprint (section 4)
and database/seed.sql service rows. Run: python3 scripts/build-services.py"""
import re, json
bp = open('documentation/project-blueprint.md', encoding='utf-8').read()
meta = {
 '4.1': ('startup-consulting','Business Startup Consulting','Business Consulting',
   'Everything a new company needs to launch properly: model, structure, processes, systems and readiness.',
   ['Business model and feasibility report','Business plan','Organisational structure','SOP and policy pack','Systems selection and setup plan','Launch readiness checklist']),
 '4.2': ('business-consulting','Business Consulting & Management Advisory','Business Consulting',
   'Strategy, process improvement, KPIs and management reporting for organisations that want to run better.',
   ['Performance assessment report','Process maps and improvement plan','KPI framework','Management reporting pack','Implementation roadmap']),
 '4.3': ('software-development','Software Product Design & Development','Technology',
   'From idea to working product: discovery, UX, architecture, build, test, deploy and support.',
   ['Product requirements document','Wireframes and clickable prototype','Design system','Working software with source code','Test report','Deployment plan and support handover']),
 '4.4': ('website-development','Website Design & Development','Technology',
   'Fast, secure, search-friendly websites and portals built to convert and to be maintained.',
   ['Sitemap and design','Responsive website','CMS or content workflow','SEO and analytics setup','Maintenance plan']),
 '4.5': ('mobile-app-development','Mobile Application Development','Technology',
   'Android, iOS and cross-platform apps for staff, customers and field teams, connected to your systems.',
   ['App design and prototype','Android and/or iOS build','API integration','Store submission support','Maintenance plan']),
 '4.6': ('pos-inventory','POS & Inventory Systems','Technology',
   'Move from manual stock control to a structured digital inventory and point-of-sale environment.',
   ['Requirements and system selection','Configured POS and inventory system','Cleaned product master data','Staff training','Inventory SOPs','Go-live support']),
 '4.7': ('erp-solutions','ERP Systems Solutions','Technology',
   'Selection, configuration, data migration and training for ERP systems that fit how you operate.',
   ['Process mapping','ERP configuration','Data migration and master data cleanup','Training materials','Reporting setup','Post-implementation support']),
 '4.8': ('inventory-audit','Inventory Audit & Reconciliation','Audit & Controls',
   'Independent stocktaking, variance investigation and reconciliation with documented corrective actions.',
   ['Stocktake count sheets and results','Variance investigation report','Reconciliation pack','Audit findings and corrective actions','Inventory SOPs']),
 '4.9': ('accounting-consulting','Accounting & Financial Consulting','Business Consulting',
   'Accounting process design, system setup, management accounting and financial controls.',
   ['Accounting process design','Chart of accounts and system setup plan','Management report templates','Budget and forecast model','Controls checklist']),
 '4.10': ('hr-administration','HR & Administrative Services','Business Consulting',
   'HR structures, policies, systems and administrative workflows for growing teams.',
   ['Organisation chart and job descriptions','HR policies and staff handbook','Recruitment and onboarding process','HR system setup plan','Administrative workflow documentation']),
 '4.11': ('procurement-supply-chain','Procurement & Supply Chain Consulting','Business Consulting',
   'Purchasing controls, supplier management and replenishment that protect margin and availability.',
   ['Procurement process and approval matrix','Supplier evaluation framework','Replenishment rules','Supplier performance reports']),
 '4.12': ('business-automation','Business Automation & Digital Transformation','Technology',
   'Workflows, approvals, dashboards and integrations that remove manual effort and errors.',
   ['Automation opportunity assessment','Workflow and approval automation','Dashboards and reports','Integrations','Data migration plan']),
 '4.13': ('managed-services','Managed Services & Support','Support',
   'Ongoing support, monitoring and periodic reviews so your systems and controls keep working.',
   ['Support agreement and service levels','Monitoring and maintenance','Periodic operational review reports','User training']),
}
out=[]
parts = re.split(r'\n## (4\.\d+) ', bp)
for i in range(1,len(parts),2):
    num, body = parts[i], parts[i+1]
    if num not in meta: continue
    slug,title,cat,summary,deliv = meta[num]
    bullets = [re.sub(r'\.$','',b.strip()) for b in re.findall(r'^- (.+)$', body.split('\n# ')[0], re.M)]
    out.append(dict(slug=slug,title=title,category=cat,summary=summary,offerings=bullets,deliverables=deliv,sortOrder=len(out)*10+10))
assert len(out)==13, len(out)
json.dump(out, open('packages/business-logic/data/services.json','w',encoding='utf-8'), indent=2, ensure_ascii=False)

def q(s): return "'" + s.replace("'", "''") + "'"
def arr(a): return "array[" + ",".join(q(x) for x in a) + "]::text[]"
rows=",\n".join(f"  ({q(s['slug'])}, {q(s['category'])}, {q(s['title'])}, {q(s['summary'])}, {arr(s['offerings'])}, {arr(s['deliverables'])}, {s['sortOrder']})" for s in out)
sql = f"""-- GENERATED by scripts/build-services.py from the master blueprint. Do not edit by hand.
insert into service_catalogue (slug, category, title, summary, offerings, deliverables, sort_order) values
{rows}
on conflict (slug) do update set category = excluded.category, title = excluded.title, summary = excluded.summary,
  offerings = excluded.offerings, deliverables = excluded.deliverables, sort_order = excluded.sort_order;
"""
open('database/seed-services.generated.sql','w',encoding='utf-8').write(sql)
print([ (s['slug'],len(s['offerings'])) for s in out])
