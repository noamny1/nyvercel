export function Directory({ floors }: { floors: { name: string; rooms: { name: string; detail: string }[] }[] }) {
  if (floors.length === 0) return null;
  return (
    <div className="widget">
      <h3>קומות</h3>
      {floors.map((floor) => (
        <div key={floor.name}>
          <strong>{floor.name}</strong>
          {floor.rooms.map((room) => (
            <div className="notice" key={`${floor.name}-${room.name}`}>{room.name}{room.detail ? ` · ${room.detail}` : ""}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
