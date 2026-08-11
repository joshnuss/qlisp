; nth is defined in src/stdlib.lisp, 0-indexed
(print (nth 0 (list 10 20 30)))
(print (nth 1 (list 10 20 30)))
(print (nth 2 (list 10 20 30)))

; second and third are nth sugar for the common cases
(print (second (list 10 20 30)))
(print (third (list 10 20 30)))
