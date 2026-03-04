import { BarChart3, Droplets, Target } from 'lucide-react';

const cards = [
  {
    title: 'Spot your low-margin best-sellers',
    body: 'See which top sellers are actually costing you money.',
    icon: BarChart3,
  },
  {
    title: 'Catch over-pouring and comps',
    body: 'Find variance and comps that are eating into your pour cost.',
    icon: Droplets,
  },
  {
    title: 'Price suggestions based on real costs',
    body: 'Know what to charge using your actual ingredient costs.',
    icon: Target,
  },
];

export default function ValueCards() {
  return (
    <section className="value-cards-section" aria-label="What you get">
      <h2 className="value-cards-heading">What we help you with</h2>
      <div className="value-cards">
        {cards.map(({ title, body, icon: Icon }) => (
          <div key={title} className="value-card">
            <div className="value-card-icon-wrap" aria-hidden>
              <Icon size={22} strokeWidth={2} className="value-card-icon" />
            </div>
            <h3 className="value-card-title">{title}</h3>
            <p className="value-card-body">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
