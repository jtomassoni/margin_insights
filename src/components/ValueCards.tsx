import { BarChart3, Droplets, Target } from 'lucide-react';

const cards = [
  {
    title: 'Spot low-margin best-sellers',
    body: 'See which top sellers make the least profit.',
    icon: BarChart3,
  },
  {
    title: 'Catch over-pouring & comps',
    body: 'Flag variance and comps that hurt pour cost.',
    icon: Droplets,
  },
  {
    title: 'Price suggestions from real costs',
    body: 'Target margin pricing using ingredient-level data.',
    icon: Target,
  },
];

export default function ValueCards() {
  return (
    <section className="value-cards-section" aria-label="What you get">
      <h2 className="value-cards-heading">What you get</h2>
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
