(dotimes (i 3)
  (write i))

(define total 0)
(dotimes (i 5)
  (set total (+ total i)))
(write total)
