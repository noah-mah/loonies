import { Button } from './components/button';
import './styles/globals.css';

export default {
  title: 'Coss/Button',
};

export function Stock() {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-background p-6 text-foreground">
      <Button>Button</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}

export function Dark() {
  return (
    <div className="dark bg-background p-6 text-foreground">
      <Button>Button</Button>
    </div>
  );
}
