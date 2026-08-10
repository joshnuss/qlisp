; each binding can see the ones bound before it
(let* ((x 1)
       (y (+ x 1))
       (z (+ y 1)))
  (print (list x y z)))

; shadowing an outer variable doesn't affect it outside the let*
(define x 100)
(let* ((x 1) (y (+ x 1)))
  (print y))
(print x)
