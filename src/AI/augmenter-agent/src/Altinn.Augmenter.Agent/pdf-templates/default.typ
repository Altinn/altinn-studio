#let data = json("data.json")

#set page(paper: "a4", margin: 2cm)
#set text(size: 14pt)

#text(size: 20pt, weight: "bold", fill: rgb("#1565C0"))[Altinn Augmenter Agent]

#v(1cm)

#text(size: 12pt)[Generated: #data.timestamp UTC]

#v(1fr)

#align(center)[
  #context counter(page).display("1 of 1", both: true)
]
