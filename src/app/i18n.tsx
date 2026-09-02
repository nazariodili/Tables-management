import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// ─── i18n leggero (senza dipendenze) ──────────────────────────────────────────
// Lingua rilevata dai setting del browser; se non supportata → inglese.
// La scelta è persistita in localStorage. t(key, params) interpola {segnaposto}.

export type Lang = "en" | "it" | "fr" | "es" | "de" | "pt";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
];

const SUPPORTED = new Set<Lang>(LANGS.map(l => l.code));
const LS_KEY = "tavoli_lang";

type Dict = Record<string, string>;

const en: Dict = {
  pages: "Pages",
  newPage: "New page",
  guests: "Guests",
  add: "Add",
  addGuest: "Add guest",
  addPerson: "Add person",
  searchGuest: "Search guest…",
  all: "All",
  unassigned: "Unassigned",
  assigned: "Assigned",
  manage: "Manage",
  manageTags: "Manage tags",
  done: "Done",
  listEmpty: "Your guest list is empty.",
  addFirstGuest: "Add your first guest",
  noGuests: "No guests",
  noMatches: "No matches",
  noTables: "No tables yet",
  noTablesHint: "Add your first table",
  showGuests: "Show {label} guests",
  filterBy: 'Filter by "{name}"',
  clearTagFilter: "Clear tag filter",
  hide: "Hide {label}",
  show: "Show {label}",
  close: "Close",
  clearSearch: "Clear search",
  pickColor: "Pick color",
  color: "Color",
  drawZones: "Draw zones",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  resetZoom: "Reset zoom",
  fitScreen: "Fit to screen",
  importJson: "Import (JSON)",
  exportJson: "Export (JSON)",
  saving: "Saving…",
  saveError: "Save error",
  saved: "Saved",
  addTable: "Add table",
  rectTable: "Rectangular table",
  roundTable: "Round table",
  occupiedTotal: "Occupied / total seats",
  numberOfSeats: "Number of seats",
  seats: "Seats",
  seatsInRow: "Seats in row {r}",
  rowLabel: "Row {r}",
  removeSeat: "Remove a seat",
  addSeat: "Add a seat",
  removeSeatRow: "Remove a seat from row {r}",
  addSeatRow: "Add a seat to row {r}",
  flipH: "Flip horizontal",
  flipV: "Flip vertical",
  makeVertical: "Make vertical",
  makeHorizontal: "Make horizontal",
  deleteTable: "Delete table",
  removeSlot: "Remove slot",
  addEmptySeat: "Add an empty seat here",
  changeColor: "Change color",
  textSize: "Text size",
  zoneColor: "Zone color",
  deleteZone: "Delete zone",
  dragResize: "Drag to resize",
  dblRename: "Double-click to rename",
  chipEditMove: "{name} — click to edit, drag to move",
  chipEditSeat: "{name} — click to edit, drag onto a seat",
  deleteGuest: "Delete guest",
  addTagTip: 'Add "{name}" tag',
  removeTagTip: 'Remove "{name}" tag',
  deleteTag: "Delete tag",
  newTagName: "New tag name",
  noTagsAdd: "No tags yet. Add one below.",
  noTagsHint: 'No tags yet — click "Manage tags".',
  editPerson: "Edit person",
  fullName: "Full name",
  tags: "Tags",
  allergies: "Allergies",
  allergiesPh: "e.g. nuts, gluten, lactose",
  notes: "Notes",
  notesPh: "Any note about this guest…",
  delete: "Delete",
  cancel: "Cancel",
  save: "Save",
  addToList: "Add to list",
  namePreview: "Name preview",
  tableNameLabel: "Table name",
  sideA: "Side A",
  sideB: "Side B",
  totalSeats: "Total: {n} seats ({a} + {b})",
  fewerSeats: "Fewer seats",
  moreSeats: "More seats",
  language: "Language",
  settings: "Settings",
  welcomeTitle: "Welcome to Event Seating Planner",
  welcomeSub: "Plan who sits where at your event — drag guests onto tables, in seconds.",
  obGuestsT: "Add guests",
  obGuestsD: "Build your guest list; add colors, tags, allergies and notes.",
  obTablesT: "Create tables",
  obTablesD: "Rectangular or round, with any number of seats.",
  obZonesT: "Draw zones",
  obZonesD: "Sketch the venue: dancefloor, buffet, stage, entrance…",
  obDndT: "Drag & drop",
  obDndD: "Assign, swap, reorder or remove people on the canvas.",
  obPagesT: "Pages",
  obPagesD: "Try multiple layouts as separate drafts.",
  obSavedT: "Saved in your browser",
  obSavedD: "No account needed. Your work survives refreshes.",
  getStarted: "Get started",
  duplicate: "Duplicate",
  importConfirm: "Import this file? It will replace all current data.",
  importError: "Could not import: invalid file.",
};

const it: Dict = {
  pages: "Pagine", newPage: "Nuova pagina", guests: "Invitati", add: "Aggiungi", addGuest: "Aggiungi invitato",
  addPerson: "Aggiungi persona", searchGuest: "Cerca invitato…", all: "Tutti", unassigned: "Non assegnati",
  assigned: "Assegnati", manage: "Gestisci", manageTags: "Gestisci tag", done: "Fatto",
  listEmpty: "La tua lista invitati è vuota.", addFirstGuest: "Aggiungi il primo invitato", noGuests: "Nessun invitato",
  noMatches: "Nessun risultato", noTables: "Nessun tavolo", noTablesHint: "Aggiungi il primo tavolo", showGuests: "Mostra invitati {label}", filterBy: 'Filtra per "{name}"',
  clearTagFilter: "Rimuovi filtro tag", hide: "Nascondi {label}", show: "Mostra {label}", close: "Chiudi",
  clearSearch: "Pulisci ricerca", pickColor: "Scegli colore", color: "Colore", drawZones: "Disegna zone",
  zoomIn: "Ingrandisci", zoomOut: "Rimpicciolisci", resetZoom: "Reimposta zoom", fitScreen: "Adatta allo schermo",
  importJson: "Importa (JSON)", exportJson: "Esporta (JSON)", saving: "Salvataggio…", saveError: "Errore salvataggio",
  saved: "Salvato", addTable: "Aggiungi tavolo", rectTable: "Tavolo rettangolare", roundTable: "Tavolo rotondo",
  occupiedTotal: "Posti occupati / totali", numberOfSeats: "Numero di posti", seats: "Posti",
  seatsInRow: "Posti nella riga {r}", rowLabel: "Riga {r}", removeSeat: "Rimuovi un posto", addSeat: "Aggiungi un posto",
  removeSeatRow: "Rimuovi un posto dalla riga {r}", addSeatRow: "Aggiungi un posto alla riga {r}",
  flipH: "Ribalta orizzontale", flipV: "Ribalta verticale", makeVertical: "Rendi verticale", makeHorizontal: "Rendi orizzontale",
  deleteTable: "Elimina tavolo", removeSlot: "Rimuovi posto", addEmptySeat: "Aggiungi un posto vuoto qui",
  changeColor: "Cambia colore", textSize: "Dimensione testo", zoneColor: "Colore zona", deleteZone: "Elimina zona",
  dragResize: "Trascina per ridimensionare", dblRename: "Doppio clic per rinominare",
  chipEditMove: "{name} — clic per modificare, trascina per spostare", chipEditSeat: "{name} — clic per modificare, trascina su un posto",
  deleteGuest: "Elimina invitato", addTagTip: 'Aggiungi tag "{name}"', removeTagTip: 'Rimuovi tag "{name}"',
  deleteTag: "Elimina tag", newTagName: "Nome nuovo tag", noTagsAdd: "Nessun tag. Aggiungine uno sotto.",
  noTagsHint: 'Nessun tag — clic su "Gestisci tag".', editPerson: "Modifica persona", fullName: "Nome completo", tags: "Tag",
  allergies: "Allergie", allergiesPh: "es. frutta secca, glutine, lattosio", notes: "Note",
  notesPh: "Una nota su questo invitato…", delete: "Elimina", cancel: "Annulla", save: "Salva", addToList: "Aggiungi alla lista",
  namePreview: "Anteprima nome", tableNameLabel: "Nome tavolo", sideA: "Lato A", sideB: "Lato B",
  totalSeats: "Totale: {n} posti ({a} + {b})", fewerSeats: "Meno posti", moreSeats: "Più posti", language: "Lingua", settings: "Impostazioni",
  welcomeTitle: "Benvenuto in Event Seating Planner", welcomeSub: "Organizza chi siede dove — trascina gli invitati sui tavoli, in pochi secondi.",
  obGuestsT: "Aggiungi invitati", obGuestsD: "Crea la lista; aggiungi colori, tag, allergie e note.",
  obTablesT: "Crea tavoli", obTablesD: "Rettangolari o rotondi, con qualsiasi numero di posti.",
  obZonesT: "Disegna zone", obZonesD: "Traccia la location: pista, buffet, palco, ingresso…",
  obDndT: "Trascina e rilascia", obDndD: "Assegna, scambia, riordina o rimuovi le persone sul canvas.",
  obPagesT: "Pagine", obPagesD: "Prova più disposizioni come bozze separate.",
  obSavedT: "Salvato nel browser", obSavedD: "Nessun account. Il lavoro sopravvive ai refresh.",
  getStarted: "Inizia", duplicate: "Duplica",
  importConfirm: "Importare questo file? Sostituirà tutti i dati attuali.", importError: "Impossibile importare: file non valido.",
};

const fr: Dict = {
  pages: "Pages", newPage: "Nouvelle page", guests: "Invités", add: "Ajouter", addGuest: "Ajouter un invité",
  addPerson: "Ajouter une personne", searchGuest: "Rechercher un invité…", all: "Tous", unassigned: "Non placés",
  assigned: "Placés", manage: "Gérer", manageTags: "Gérer les tags", done: "Terminé",
  listEmpty: "Votre liste d'invités est vide.", addFirstGuest: "Ajoutez votre premier invité", noGuests: "Aucun invité",
  noMatches: "Aucun résultat", noTables: "Aucune table", noTablesHint: "Ajoutez votre première table", showGuests: "Afficher les invités {label}", filterBy: 'Filtrer par "{name}"',
  clearTagFilter: "Effacer le filtre", hide: "Masquer {label}", show: "Afficher {label}", close: "Fermer",
  clearSearch: "Effacer la recherche", pickColor: "Choisir une couleur", color: "Couleur", drawZones: "Dessiner des zones",
  zoomIn: "Zoom avant", zoomOut: "Zoom arrière", resetZoom: "Réinitialiser le zoom", fitScreen: "Ajuster à l'écran",
  importJson: "Importer (JSON)", exportJson: "Exporter (JSON)", saving: "Enregistrement…", saveError: "Erreur d'enregistrement",
  saved: "Enregistré", addTable: "Ajouter une table", rectTable: "Table rectangulaire", roundTable: "Table ronde",
  occupiedTotal: "Places occupées / totales", numberOfSeats: "Nombre de places", seats: "Places",
  seatsInRow: "Places dans la rangée {r}", rowLabel: "Rangée {r}", removeSeat: "Retirer une place", addSeat: "Ajouter une place",
  removeSeatRow: "Retirer une place de la rangée {r}", addSeatRow: "Ajouter une place à la rangée {r}",
  flipH: "Retourner horizontalement", flipV: "Retourner verticalement", makeVertical: "Mettre à la verticale", makeHorizontal: "Mettre à l'horizontale",
  deleteTable: "Supprimer la table", removeSlot: "Retirer la place", addEmptySeat: "Ajouter une place vide ici",
  changeColor: "Changer la couleur", textSize: "Taille du texte", zoneColor: "Couleur de la zone", deleteZone: "Supprimer la zone",
  dragResize: "Glisser pour redimensionner", dblRename: "Double-clic pour renommer",
  chipEditMove: "{name} — cliquez pour modifier, glissez pour déplacer", chipEditSeat: "{name} — cliquez pour modifier, glissez sur une place",
  deleteGuest: "Supprimer l'invité", addTagTip: 'Ajouter le tag "{name}"', removeTagTip: 'Retirer le tag "{name}"',
  deleteTag: "Supprimer le tag", newTagName: "Nom du nouveau tag", noTagsAdd: "Aucun tag. Ajoutez-en un ci-dessous.",
  noTagsHint: 'Aucun tag — cliquez sur "Gérer les tags".', editPerson: "Modifier la personne", fullName: "Nom complet", tags: "Tags",
  allergies: "Allergies", allergiesPh: "ex. fruits à coque, gluten, lactose", notes: "Notes",
  notesPh: "Une note sur cet invité…", delete: "Supprimer", cancel: "Annuler", save: "Enregistrer", addToList: "Ajouter à la liste",
  namePreview: "Aperçu du nom", tableNameLabel: "Nom de la table", sideA: "Côté A", sideB: "Côté B",
  totalSeats: "Total : {n} places ({a} + {b})", fewerSeats: "Moins de places", moreSeats: "Plus de places", language: "Langue", settings: "Paramètres",
  welcomeTitle: "Bienvenue sur Event Seating Planner", welcomeSub: "Organisez qui s'assoit où — glissez les invités sur les tables, en quelques secondes.",
  obGuestsT: "Ajouter des invités", obGuestsD: "Créez votre liste ; ajoutez couleurs, tags, allergies et notes.",
  obTablesT: "Créer des tables", obTablesD: "Rectangulaires ou rondes, avec un nombre libre de places.",
  obZonesT: "Dessiner des zones", obZonesD: "Esquissez le lieu : piste, buffet, scène, entrée…",
  obDndT: "Glisser-déposer", obDndD: "Placez, échangez, réordonnez ou retirez les personnes.",
  obPagesT: "Pages", obPagesD: "Essayez plusieurs dispositions comme brouillons.",
  obSavedT: "Enregistré dans le navigateur", obSavedD: "Aucun compte. Votre travail survit aux rechargements.",
  getStarted: "Commencer", duplicate: "Dupliquer",
  importConfirm: "Importer ce fichier ? Il remplacera toutes les données actuelles.", importError: "Import impossible : fichier invalide.",
};

const es: Dict = {
  pages: "Páginas", newPage: "Nueva página", guests: "Invitados", add: "Añadir", addGuest: "Añadir invitado",
  addPerson: "Añadir persona", searchGuest: "Buscar invitado…", all: "Todos", unassigned: "Sin asignar",
  assigned: "Asignados", manage: "Gestionar", manageTags: "Gestionar etiquetas", done: "Listo",
  listEmpty: "Tu lista de invitados está vacía.", addFirstGuest: "Añade tu primer invitado", noGuests: "Sin invitados",
  noMatches: "Sin resultados", noTables: "Sin mesas", noTablesHint: "Añade tu primera mesa", showGuests: "Mostrar invitados {label}", filterBy: 'Filtrar por "{name}"',
  clearTagFilter: "Quitar filtro", hide: "Ocultar {label}", show: "Mostrar {label}", close: "Cerrar",
  clearSearch: "Borrar búsqueda", pickColor: "Elegir color", color: "Color", drawZones: "Dibujar zonas",
  zoomIn: "Acercar", zoomOut: "Alejar", resetZoom: "Restablecer zoom", fitScreen: "Ajustar a pantalla",
  importJson: "Importar (JSON)", exportJson: "Exportar (JSON)", saving: "Guardando…", saveError: "Error al guardar",
  saved: "Guardado", addTable: "Añadir mesa", rectTable: "Mesa rectangular", roundTable: "Mesa redonda",
  occupiedTotal: "Asientos ocupados / totales", numberOfSeats: "Número de asientos", seats: "Asientos",
  seatsInRow: "Asientos en la fila {r}", rowLabel: "Fila {r}", removeSeat: "Quitar un asiento", addSeat: "Añadir un asiento",
  removeSeatRow: "Quitar un asiento de la fila {r}", addSeatRow: "Añadir un asiento a la fila {r}",
  flipH: "Voltear horizontal", flipV: "Voltear vertical", makeVertical: "Poner vertical", makeHorizontal: "Poner horizontal",
  deleteTable: "Eliminar mesa", removeSlot: "Quitar asiento", addEmptySeat: "Añadir un asiento vacío aquí",
  changeColor: "Cambiar color", textSize: "Tamaño del texto", zoneColor: "Color de la zona", deleteZone: "Eliminar zona",
  dragResize: "Arrastra para redimensionar", dblRename: "Doble clic para renombrar",
  chipEditMove: "{name} — clic para editar, arrastra para mover", chipEditSeat: "{name} — clic para editar, arrastra a un asiento",
  deleteGuest: "Eliminar invitado", addTagTip: 'Añadir etiqueta "{name}"', removeTagTip: 'Quitar etiqueta "{name}"',
  deleteTag: "Eliminar etiqueta", newTagName: "Nombre de etiqueta", noTagsAdd: "Sin etiquetas. Añade una abajo.",
  noTagsHint: 'Sin etiquetas — clic en "Gestionar etiquetas".', editPerson: "Editar persona", fullName: "Nombre completo", tags: "Etiquetas",
  allergies: "Alergias", allergiesPh: "p. ej. frutos secos, gluten, lactosa", notes: "Notas",
  notesPh: "Una nota sobre este invitado…", delete: "Eliminar", cancel: "Cancelar", save: "Guardar", addToList: "Añadir a la lista",
  namePreview: "Vista previa del nombre", tableNameLabel: "Nombre de la mesa", sideA: "Lado A", sideB: "Lado B",
  totalSeats: "Total: {n} asientos ({a} + {b})", fewerSeats: "Menos asientos", moreSeats: "Más asientos", language: "Idioma", settings: "Ajustes",
  welcomeTitle: "Bienvenido a Event Seating Planner", welcomeSub: "Organiza quién se sienta dónde — arrastra invitados a las mesas, en segundos.",
  obGuestsT: "Añadir invitados", obGuestsD: "Crea tu lista; añade colores, etiquetas, alergias y notas.",
  obTablesT: "Crear mesas", obTablesD: "Rectangulares o redondas, con cualquier número de asientos.",
  obZonesT: "Dibujar zonas", obZonesD: "Esboza el lugar: pista, bufé, escenario, entrada…",
  obDndT: "Arrastrar y soltar", obDndD: "Asigna, intercambia, reordena o quita personas en el lienzo.",
  obPagesT: "Páginas", obPagesD: "Prueba varias disposiciones como borradores.",
  obSavedT: "Guardado en el navegador", obSavedD: "Sin cuenta. Tu trabajo sobrevive a las recargas.",
  getStarted: "Empezar", duplicate: "Duplicar",
  importConfirm: "¿Importar este archivo? Reemplazará todos los datos actuales.", importError: "No se pudo importar: archivo no válido.",
};

const de: Dict = {
  pages: "Seiten", newPage: "Neue Seite", guests: "Gäste", add: "Hinzufügen", addGuest: "Gast hinzufügen",
  addPerson: "Person hinzufügen", searchGuest: "Gast suchen…", all: "Alle", unassigned: "Nicht zugewiesen",
  assigned: "Zugewiesen", manage: "Verwalten", manageTags: "Tags verwalten", done: "Fertig",
  listEmpty: "Deine Gästeliste ist leer.", addFirstGuest: "Ersten Gast hinzufügen", noGuests: "Keine Gäste",
  noMatches: "Keine Treffer", noTables: "Noch keine Tische", noTablesHint: "Füge deinen ersten Tisch hinzu", showGuests: "{label} Gäste anzeigen", filterBy: 'Nach "{name}" filtern',
  clearTagFilter: "Filter löschen", hide: "{label} ausblenden", show: "{label} anzeigen", close: "Schließen",
  clearSearch: "Suche löschen", pickColor: "Farbe wählen", color: "Farbe", drawZones: "Zonen zeichnen",
  zoomIn: "Vergrößern", zoomOut: "Verkleinern", resetZoom: "Zoom zurücksetzen", fitScreen: "An Bildschirm anpassen",
  importJson: "Importieren (JSON)", exportJson: "Exportieren (JSON)", saving: "Speichern…", saveError: "Speicherfehler",
  saved: "Gespeichert", addTable: "Tisch hinzufügen", rectTable: "Rechteckiger Tisch", roundTable: "Runder Tisch",
  occupiedTotal: "Belegte / gesamte Plätze", numberOfSeats: "Anzahl der Plätze", seats: "Plätze",
  seatsInRow: "Plätze in Reihe {r}", rowLabel: "Reihe {r}", removeSeat: "Platz entfernen", addSeat: "Platz hinzufügen",
  removeSeatRow: "Platz aus Reihe {r} entfernen", addSeatRow: "Platz zu Reihe {r} hinzufügen",
  flipH: "Horizontal spiegeln", flipV: "Vertikal spiegeln", makeVertical: "Vertikal machen", makeHorizontal: "Horizontal machen",
  deleteTable: "Tisch löschen", removeSlot: "Platz entfernen", addEmptySeat: "Hier einen leeren Platz hinzufügen",
  changeColor: "Farbe ändern", textSize: "Textgröße", zoneColor: "Zonenfarbe", deleteZone: "Zone löschen",
  dragResize: "Zum Größenändern ziehen", dblRename: "Doppelklick zum Umbenennen",
  chipEditMove: "{name} — klicken zum Bearbeiten, ziehen zum Verschieben", chipEditSeat: "{name} — klicken zum Bearbeiten, auf einen Platz ziehen",
  deleteGuest: "Gast löschen", addTagTip: 'Tag "{name}" hinzufügen', removeTagTip: 'Tag "{name}" entfernen',
  deleteTag: "Tag löschen", newTagName: "Neuer Tag-Name", noTagsAdd: "Noch keine Tags. Unten einen hinzufügen.",
  noTagsHint: 'Noch keine Tags — auf "Tags verwalten" klicken.', editPerson: "Person bearbeiten", fullName: "Vollständiger Name", tags: "Tags",
  allergies: "Allergien", allergiesPh: "z. B. Nüsse, Gluten, Laktose", notes: "Notizen",
  notesPh: "Eine Notiz zu diesem Gast…", delete: "Löschen", cancel: "Abbrechen", save: "Speichern", addToList: "Zur Liste hinzufügen",
  namePreview: "Namensvorschau", tableNameLabel: "Tischname", sideA: "Seite A", sideB: "Seite B",
  totalSeats: "Gesamt: {n} Plätze ({a} + {b})", fewerSeats: "Weniger Plätze", moreSeats: "Mehr Plätze", language: "Sprache", settings: "Einstellungen",
  welcomeTitle: "Willkommen bei Event Seating Planner", welcomeSub: "Plane, wer wo sitzt — ziehe Gäste in Sekunden an die Tische.",
  obGuestsT: "Gäste hinzufügen", obGuestsD: "Erstelle deine Liste; füge Farben, Tags, Allergien und Notizen hinzu.",
  obTablesT: "Tische erstellen", obTablesD: "Rechteckig oder rund, mit beliebig vielen Plätzen.",
  obZonesT: "Zonen zeichnen", obZonesD: "Skizziere die Location: Tanzfläche, Buffet, Bühne, Eingang…",
  obDndT: "Ziehen & Ablegen", obDndD: "Personen zuweisen, tauschen, umordnen oder entfernen.",
  obPagesT: "Seiten", obPagesD: "Probiere mehrere Layouts als separate Entwürfe.",
  obSavedT: "Im Browser gespeichert", obSavedD: "Kein Konto nötig. Deine Arbeit übersteht Neuladen.",
  getStarted: "Loslegen", duplicate: "Duplizieren",
  importConfirm: "Diese Datei importieren? Alle aktuellen Daten werden ersetzt.", importError: "Import fehlgeschlagen: ungültige Datei.",
};

const pt: Dict = {
  pages: "Páginas", newPage: "Nova página", guests: "Convidados", add: "Adicionar", addGuest: "Adicionar convidado",
  addPerson: "Adicionar pessoa", searchGuest: "Buscar convidado…", all: "Todos", unassigned: "Não atribuídos",
  assigned: "Atribuídos", manage: "Gerir", manageTags: "Gerir tags", done: "Concluído",
  listEmpty: "A sua lista de convidados está vazia.", addFirstGuest: "Adicione o primeiro convidado", noGuests: "Sem convidados",
  noMatches: "Sem resultados", noTables: "Sem mesas", noTablesHint: "Adicione a sua primeira mesa", showGuests: "Mostrar convidados {label}", filterBy: 'Filtrar por "{name}"',
  clearTagFilter: "Limpar filtro", hide: "Ocultar {label}", show: "Mostrar {label}", close: "Fechar",
  clearSearch: "Limpar pesquisa", pickColor: "Escolher cor", color: "Cor", drawZones: "Desenhar zonas",
  zoomIn: "Aproximar", zoomOut: "Afastar", resetZoom: "Repor zoom", fitScreen: "Ajustar ao ecrã",
  importJson: "Importar (JSON)", exportJson: "Exportar (JSON)", saving: "A guardar…", saveError: "Erro ao guardar",
  saved: "Guardado", addTable: "Adicionar mesa", rectTable: "Mesa retangular", roundTable: "Mesa redonda",
  occupiedTotal: "Lugares ocupados / totais", numberOfSeats: "Número de lugares", seats: "Lugares",
  seatsInRow: "Lugares na fila {r}", rowLabel: "Fila {r}", removeSeat: "Remover um lugar", addSeat: "Adicionar um lugar",
  removeSeatRow: "Remover um lugar da fila {r}", addSeatRow: "Adicionar um lugar à fila {r}",
  flipH: "Inverter horizontal", flipV: "Inverter vertical", makeVertical: "Tornar vertical", makeHorizontal: "Tornar horizontal",
  deleteTable: "Eliminar mesa", removeSlot: "Remover lugar", addEmptySeat: "Adicionar um lugar vazio aqui",
  changeColor: "Mudar cor", textSize: "Tamanho do texto", zoneColor: "Cor da zona", deleteZone: "Eliminar zona",
  dragResize: "Arraste para redimensionar", dblRename: "Duplo clique para renomear",
  chipEditMove: "{name} — clique para editar, arraste para mover", chipEditSeat: "{name} — clique para editar, arraste para um lugar",
  deleteGuest: "Eliminar convidado", addTagTip: 'Adicionar tag "{name}"', removeTagTip: 'Remover tag "{name}"',
  deleteTag: "Eliminar tag", newTagName: "Nome da nova tag", noTagsAdd: "Sem tags. Adicione uma abaixo.",
  noTagsHint: 'Sem tags — clique em "Gerir tags".', editPerson: "Editar pessoa", fullName: "Nome completo", tags: "Tags",
  allergies: "Alergias", allergiesPh: "ex. frutos secos, glúten, lactose", notes: "Notas",
  notesPh: "Uma nota sobre este convidado…", delete: "Eliminar", cancel: "Cancelar", save: "Guardar", addToList: "Adicionar à lista",
  namePreview: "Pré-visualização do nome", tableNameLabel: "Nome da mesa", sideA: "Lado A", sideB: "Lado B",
  totalSeats: "Total: {n} lugares ({a} + {b})", fewerSeats: "Menos lugares", moreSeats: "Mais lugares", language: "Idioma", settings: "Definições",
  welcomeTitle: "Bem-vindo ao Event Seating Planner", welcomeSub: "Planeie quem senta onde — arraste convidados para as mesas, em segundos.",
  obGuestsT: "Adicionar convidados", obGuestsD: "Crie a sua lista; adicione cores, tags, alergias e notas.",
  obTablesT: "Criar mesas", obTablesD: "Retangulares ou redondas, com qualquer número de lugares.",
  obZonesT: "Desenhar zonas", obZonesD: "Esboce o local: pista, buffet, palco, entrada…",
  obDndT: "Arrastar e largar", obDndD: "Atribua, troque, reordene ou remova pessoas no canvas.",
  obPagesT: "Páginas", obPagesD: "Experimente vários layouts como rascunhos.",
  obSavedT: "Guardado no navegador", obSavedD: "Sem conta. O seu trabalho sobrevive aos recarregamentos.",
  getStarted: "Começar", duplicate: "Duplicar",
  importConfirm: "Importar este ficheiro? Substituirá todos os dados atuais.", importError: "Não foi possível importar: ficheiro inválido.",
};

const DICT: Record<Lang, Dict> = { en, it, fr, es, de, pt };

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LS_KEY) as Lang | null;
    if (saved && SUPPORTED.has(saved)) return saved;
  } catch { /* ignore */ }
  const cands = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
  for (const c of cands) {
    const base = (c || "").slice(0, 2).toLowerCase() as Lang;
    if (SUPPORTED.has(base)) return base;
  }
  return "en";
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, params?: Record<string, string | number>) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectLang());
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LS_KEY, l); } catch { /* ignore */ }
  };
  const t = useMemo(() => (key: string, params?: Record<string, string | number>) => {
    let s = DICT[lang]?.[key] ?? DICT.en[key] ?? key;
    if (params) for (const k of Object.keys(params)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(params[k]));
    return s;
  }, [lang]);
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
export const useT = () => useI18n().t;
