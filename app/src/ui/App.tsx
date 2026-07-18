/** App shell. Chrome (toolbar, settings, status bar) is filled in as Phase 1 progresses. */
export function App() {
  return (
    <div className="app">
      <header className="app-chrome-top" />
      <main className="app-editor-scroll">
        <div className="editor-page">
          <div id="editor-mount" />
        </div>
      </main>
      <footer className="app-statusbar" />
    </div>
  )
}
