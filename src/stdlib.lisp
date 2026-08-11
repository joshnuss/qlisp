; qlisp standard library.
; Loaded into every global environment by createGlobalEnv() in env.ts.
; Definitions that don't need native support (unlike +, car, apply, ...)
; belong here, written in qlisp itself.

(defun 1+ (n) (+ n 1))
(defun 1- (n) (- n 1))

(defun not (x) (if x nil t))

(defun last (lst)
  (if (cdr lst)
      (last (cdr lst))
      (car lst)))

(defun map (f lst)
  (if lst
      (cons (apply f (list (car lst))) (map f (cdr lst)))
      (list)))

(defun filter (pred lst)
  (cond
    ((not lst) (list))
    ((apply pred (list (car lst))) (cons (car lst) (filter pred (cdr lst))))
    (t (filter pred (cdr lst)))))

(defun reduce (f lst init)
  (if lst
      (reduce f (cdr lst) (apply f (list init (car lst))))
      init))

(defun append (a b)
  (if a
      (cons (car a) (append (cdr a) b))
      b))
